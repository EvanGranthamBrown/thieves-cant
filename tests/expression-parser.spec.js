import { parse, validate, evaluate } from '../src/expressions';

describe('expressions.validate', () => {
  it('handles simple addition', () => {
    const parsed = parse('2 + 2');
    expect(validate({}, parsed)).toEqual('natural');
  });

  it('handles simple subtraction', () => {
    const parsed = parse('3 - 2');
    expect(validate({}, parsed)).toEqual('integer');
  });

  it('handles simple multiplication', () => {
    const parsed = parse('3 * 5');
    expect(validate({}, parsed)).toEqual('natural');
  });

  it('handles simple division', () => {
    const parsed = parse('12 / 6');
    expect(validate({}, parsed)).toEqual('nonnegative');
  });

  it('handles parentheses', () => {
    const parsed = parse('2 + (12 / 6)');
    expect(validate({}, parsed)).toEqual('nonnegative');
  });

  it('handles a template prop', () => {
    const parsed = parse('strength');
    expect(validate({ data: { strength: { type: 'natural' } } }, parsed)).toEqual('natural');
  });

  it('errors on a template prop if the template has no data field', () => {
    const parsed = parse('strength');
    expect(() => {
      validate({}, parsed)
    }).toThrow();
  });

  it('errors if a template prop is missing from the template\'s data field', () => {
    const parsed = parse('strength');
    expect(() => {
      validate({ data: {} }, parsed)
    }).toThrow();
  });

  it('errors if a template prop has no type set', () => {
    const parsed = parse('strength');
    expect(() => {
      validate({ data: { strength: {} } }, parsed)
    }).toThrow();
  });
});

describe('expressions.evaluate', () => {
  it('handles simple addition', () => {
    const parsed = parse('2 + 2');
    expect(evaluate({}, parsed)).toEqual(4);
  });

  it('handles simple subtraction', () => {
    const parsed = parse('3 - 2');
    expect(evaluate({}, parsed)).toEqual(1);
  });

  it('handles simple multiplication', () => {
    const parsed = parse('3 * 5');
    expect(evaluate({}, parsed)).toEqual(15);
  });

  it('handles simple division', () => {
    const parsed = parse('12 / 6');
    expect(evaluate({}, parsed)).toEqual(2);
  });

  it('handles parentheses', () => {
    const parsed = parse('2 + (12 / 6)');
    expect(evaluate({}, parsed)).toEqual(4);
  });

  it('handles a variable on an object', () => {
    const parsed = parse('strength');
    expect(evaluate({ strength: 12 }, parsed)).toEqual(12);
  });

  it('handles a dot expression', () => {
    const parsed = parse('owner.strength');
    console.log(parsed);
    expect(evaluate({ owner: { strength: 7 } }, parsed)).toEqual(7);
  });

  it('handles a dot expression that goes two deep', () => {
    const parsed = parse('wielder.owner.strength');
    console.log(parsed);
    expect(evaluate({ wielder: { owner: { strength: 13 } } }, parsed)).toEqual(13);
  });
});
