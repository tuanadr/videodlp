/**
 * Lớp ErrorResponse mở rộng từ Error để cung cấp thêm thông tin về lỗi
 * @extends Error
 */
class ErrorResponse extends Error {
  /**
   * Tạo một đối tượng ErrorResponse
   * @param {string} message - Thông báo lỗi
   * @param {number} statusCode - Mã trạng thái HTTP
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;