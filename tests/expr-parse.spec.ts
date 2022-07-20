import { ParseNode, ExprType } from '../src/expr-base';
import * as ExprParse from '../src/expr-parse';
import { findExprFunc } from '../src/expr-funcs';

class FakeNode extends ParseNode {
  private readonly fakeType: ExprType;
  constructor(type: ExprType) {
    super();
    this.fakeType = type;
  }
  public type() { return this.fakeType; }
}

describe('parse', () => {
  it('parses a complex expression correctly', () => {
    const parsed = ExprParse.parse('(dexMod + ((1d8 +  2) -deity.adjustment / piety)) + " and roll 2d8"');

    expect(parsed).toEqual(
      new ExprParse.FuncNode(
        new findExprFunc('+', [new FakeNode(ExprType.Text), new FakeNode(ExprType.Text)], true),
        [
          new ExprParse.FuncNode(
            new findExprFunc('+', [new FakeNode(ExprType.Number), new FakeNode(ExprType.Number)], true),
            [
              new ExprParse.IdentifierNode('dexMod'),
              new ExprParse.FuncNode(
                new findExprFunc('-', [new FakeNode(ExprType.Number), new FakeNode(ExprType.Number)], true),
                [
                  new ExprParse.FuncNode(
                    new findExprFunc('+', [new FakeNode(ExprType.Number), new FakeNode(ExprType.Number)], true),
                    [
                      new ExprParse.DiceLiteralNode(1, 8),
                      new ExprParse.NumberLiteralNode(2),
                    ],
                  ),
                  new ExprParse.FuncNode(
                    new findExprFunc('/', [new FakeNode(ExprType.Number), new FakeNode(ExprType.Number)], true),
                    [
                      new ExprParse.MemberExpressionNode(
                        new ExprParse.IdentifierNode('deity'),
                        'adjustment'
                      ),
                      new ExprParse.IdentifierNode('piety'),
                    ],
                  ),
                ],
              ),
            ],
          ),
          new ExprParse.StringLiteralNode(" and roll 2d8"),
        ],
      )
    );
  });

  it('evaluates a complex expression correctly', () => {
    const parsed = ExprParse.parse('(dexMod + ((1d8 +  2) -deity.adjustment / piety)) + " and roll 2d8"');
    const props = {
      vals: {
        dexMod: 5,
        deity: {
          adjustment: 3,
        },
        piety: 10,
      },
      forceMax: true,
    };

    // (5 + ((1d8 +  2) - 3 / 10)) + " and roll 2d8"
    // (5 + ((1d8 + 2) - 0.3)) + " and roll 2d8"
    // force 1d8 to maximum
    // (5 + (10 - 0.3)) + " and roll 2d8"
    // (5 + 9.7) + " and roll 2d8"
    // "14.7 and roll 2d8"

    expect(parsed.eval(props)).toEqual('14.7 and roll 2d8');
  });

  it('describes a complex expression correctly', () => {
    const parsed = ExprParse.parse('(dexMod + ((1d8 +  2) -deity.adjustment / piety)) + " and roll 2d8"');
    // note that the formatting gets standardized
    expect(parsed.describe({ vals: {} })).toEqual('(dexMod + ((1d8 + 2) - (deity.adjustment / piety))) + " and roll 2d8"');
  });

  it('describes a complex expression correctly with diceOnly = true', () => {
    const parsed = ExprParse.parse('(dexMod + ((1d8 +  2) -deity.adjustment / piety)) + " and roll 2d8"');
    const props = {
      vals: {
        dexMod: 5,
        deity: {
          adjustment: 3,
        },
        piety: 10,
      },
      diceOnly: true,
    };
    expect(parsed.describe(props)).toEqual('(5 + ((1d8 + 2) - 0.3)) + " and roll 2d8"');
  });

  it('parses a list function without erroring', () => {
    expect(() => {
      ExprParse.parse('sum(inventory)');
    }).not.toThrow();
  });

  it('evaluates a list function correctly', () => {
    const parsed = ExprParse.parse('sum(inventory)');
    const props = {
      vals: {
        inventory: [1,2,3],
      },
    };
    expect(parsed.eval(props)).toEqual(6);
  });

  it('parses a member expression without erroring', () => {
    expect(() => {
      ExprParse.parse('item.weight');
    }).not.toThrow();
  });

  it('evaluates a member expression correctly', () => {
    const parsed = ExprParse.parse('item.weight');
    const props = {
      vals: {
        item: {
          weight: 5,
        },
      },
    };
    expect(parsed.eval(props)).toEqual(5);
  });

  it('evaluates a member expression on an array to return an array', () => {
    const parsed = ExprParse.parse('inventory.weight');
    const props = {
      vals: {
        inventory: [
          { weight: 3 },
          { weight: 5 },
          { weight: 7 },
        ],
      },
    };
    expect(parsed.eval(props)).toEqual([3, 5, 7]);
  });
});
