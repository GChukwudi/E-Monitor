const html2pdf = jest.fn(() => ({
  set: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  save: jest.fn().mockReturnThis(),
  output: jest.fn().mockResolvedValue('mock-pdf-blob'),
  toPdf: jest.fn().mockReturnThis(),
  get: jest.fn().mockReturnThis(),
}));

module.exports = html2pdf;