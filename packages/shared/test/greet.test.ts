import { expect } from 'chai';
import { greet } from '../index.js';

describe('greet', () => {
  it('returns greeting with name', () => {
    const result = greet('Claude');
    expect(result).to.equal('Hello, Claude!');
  });

  it('handles empty string', () => {
    const result = greet('');
    expect(result).to.equal('Hello, !');
  });
});
