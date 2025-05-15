import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionDocument extends Document {
  user: mongoose.Schema.Types.ObjectId | string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  plan: 'premium';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
}

const SubscriptionSchema: Schema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired'],
    default: 'active'
  },
  plan: {
    type: String,
    enum: ['premium'],
    default: 'premium'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<ISubscriptionDocument>('Subscription', SubscriptionSchema);