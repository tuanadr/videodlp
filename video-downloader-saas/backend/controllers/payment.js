const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Subscription = require('../models/Subscription');

/**
 * @desc    Tạo phiên thanh toán Stripe
 * @route   POST /api/payments/create-checkout-session
 * @access  Private
 */
exports.createCheckoutSession = async (req, res, next) => {
  try {
    // Lấy thông tin người dùng
    const user = await User.findById(req.user.id);

    // Kiểm tra nếu người dùng đã có gói Premium
    if (user.subscription === 'premium') {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đăng ký gói Premium'
      });
    }

    // Tạo hoặc lấy Stripe customer
    let customer;
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });

      // Lưu Stripe customer ID vào user
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: customer.id
      });
    }

    // Tạo checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Gói Premium',
              description: 'Tải video không giới hạn, chất lượng cao và nhiều tính năng khác',
            },
            unit_amount: 999, // $9.99
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      metadata: {
        userId: user._id.toString()
      }
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Lỗi khi tạo phiên thanh toán:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo phiên thanh toán',
      error: error.message
    });
  }
};

/**
 * @desc    Xử lý webhook từ Stripe
 * @route   POST /api/payments/webhook
 * @access  Public
 */
exports.handleWebhook = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Lỗi webhook:', error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Xử lý các sự kiện
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

/**
 * @desc    Lấy thông tin đăng ký của người dùng
 * @route   GET /api/payments/subscription
 * @access  Private
 */
exports.getSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user.id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đăng ký'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể lấy thông tin đăng ký',
      error: error.message
    });
  }
};

/**
 * @desc    Hủy đăng ký
 * @route   POST /api/payments/cancel-subscription
 * @access  Private
 */
exports.cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user.id });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin đăng ký'
      });
    }

    // Hủy đăng ký trên Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Cập nhật trạng thái trong cơ sở dữ liệu
    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Đăng ký sẽ bị hủy vào cuối kỳ thanh toán',
      data: subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể hủy đăng ký',
      error: error.message
    });
  }
};

/**
 * Xử lý sự kiện checkout.session.completed
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    // Lấy thông tin người dùng từ metadata
    const userId = session.metadata.userId;
    
    // Lấy thông tin đăng ký từ session
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    // Tạo bản ghi đăng ký mới
    await Subscription.create({
      user: userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCustomerId: session.customer,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
    
    // Cập nhật trạng thái người dùng
    await User.findByIdAndUpdate(userId, {
      subscription: 'premium'
    });
  } catch (error) {
    console.error('Lỗi khi xử lý checkout.session.completed:', error);
  }
}

/**
 * Xử lý sự kiện invoice.paid
 */
async function handleInvoicePaid(invoice) {
  try {
    // Lấy thông tin đăng ký
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    
    // Cập nhật thông tin đăng ký trong cơ sở dữ liệu
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    );
    
    // Đảm bảo người dùng có trạng thái premium
    const subscriptionRecord = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
    if (subscriptionRecord) {
      await User.findByIdAndUpdate(subscriptionRecord.user, {
        subscription: 'premium'
      });
    }
  } catch (error) {
    console.error('Lỗi khi xử lý invoice.paid:', error);
  }
}

/**
 * Xử lý sự kiện invoice.payment_failed
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    // Lấy thông tin đăng ký
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    
    // Cập nhật trạng thái đăng ký trong cơ sở dữ liệu
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { status: subscription.status }
    );
  } catch (error) {
    console.error('Lỗi khi xử lý invoice.payment_failed:', error);
  }
}

/**
 * Xử lý sự kiện customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    // Cập nhật thông tin đăng ký trong cơ sở dữ liệu
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    );
  } catch (error) {
    console.error('Lỗi khi xử lý customer.subscription.updated:', error);
  }
}

/**
 * Xử lý sự kiện customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    // Tìm bản ghi đăng ký
    const subscriptionRecord = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
    
    if (subscriptionRecord) {
      // Cập nhật trạng thái người dùng
      await User.findByIdAndUpdate(subscriptionRecord.user, {
        subscription: 'free'
      });
      
      // Cập nhật hoặc xóa bản ghi đăng ký
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: 'canceled' }
      );
    }
  } catch (error) {
    console.error('Lỗi khi xử lý customer.subscription.deleted:', error);
  }
}