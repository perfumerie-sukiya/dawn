const stripBomLoader = require('../strip-bom-loader');

describe('strip-bom-loader', () => {
  test('removes a leading BOM from compiled Sass', () => {
    expect(stripBomLoader('\uFEFF:root{}')).toBe(':root{}');
  });

  test('leaves BOM-free CSS unchanged', () => {
    expect(stripBomLoader(':root{}')).toBe(':root{}');
  });
});
