import * as Jsep from 'jsep';
import { ParseNode, ExprType, EvalProps, DescProps, DescResult } from './expr-base';
import { ExprFunc, findExprFunc } from './expr-funcs';

Jsep.addIdentifierChar('@');

// Identifies dice expressions ("1d20", "10d6", etc.).
const diceExpressionRegex = /([0-9]+[dD][0-9]+)/g;
const diceIndicator = '_@@';

// Prepend @@_ to all dice expressions, so the parser can recognize them.
function addDiceIndicators(str: string) {
  if(str.includes(diceIndicator)) {
    throw new Error(`Expressions may not include the text "${diceIndicator}".`);
  }
  return str.replaceAll(diceExpressionRegex, `${diceIndicator}$1`);
}

// Parses a dice expression, when possible.
function diceExpressionFrom(str) {
  if(str.substring(0, diceIndicator.length) === diceIndicator) {
    const expr = str.substring(diceIndicator.length).toLowerCase().split('d');
    return expr.map((x) => Number(x));
  }
  return null;
}

export function parse(str: string) {
  const parsed = Jsep.parse(addDiceIndicators(str));
  return createParseNode(parsed);
}

function createParseNode(parsed: any) {
  switch(parsed.type) {
    case 'BinaryExpression': {
      const args = [createParseNode(parsed.left), createParseNode(parsed.right)];
      return new FuncNode(
        findExprFunc(parsed.operator, args, true),
        args,
      );
    }
    case 'UnaryExpression': {
      const args = [createParseNode(parsed.argument)];
      return new FuncNode(
        findExprFunc(parsed.operator, args, true),
        args,
      );
    }
    case 'MemberExpression': {
      return new MemberExpressionNode(
        createParseNode(parsed.object),
        parsed.property.name, // potential issues here if foo[bar] is used
      );
    }
    case 'CallExpression': {
      const args = parsed.arguments.map(createParseNode);
      return new FuncNode(
        findExprFunc(parsed.callee.name, args, false),
        args,
      );
    }
    case 'Literal': {
      if(typeof parsed.value === 'number') {
        return new NumberLiteralNode(parsed.value);
      }
      if(typeof parsed.value === 'string') {
        return new StringLiteralNode(parsed.value);
      }
      throw new Error(`Literals of type "${typeof parsed.value}" not supported.`);
    }
    case 'Identifier': {
      const dice = diceExpressionFrom(parsed.name);
      if(dice) {
        return new DiceLiteralNode(dice[0], dice[1]);
      }
      return new IdentifierNode(parsed.name);
    }
    default: {
      throw new Error(`${parsed['type']} not supported.`);
    }
  }
}

export class MemberExpressionNode extends ParseNode {
  public obj: ParseNode;
  public readonly prop: string;

  constructor(obj: ParseNode, prop: string) {
    super();
    this.obj = obj;
    this.prop = prop;
  }

  public eval(props: EvalProps): any {
    const obj = this.obj.eval(props);
    if(Array.isArray(obj)) {
      return obj.map((x) => x[this.prop]);
    }
    return obj[this.prop];
  }

  public describeInner(props: DescProps): DescResult {
    const obj = this.obj.describeInner(props);
    if(obj.text) {
      return { text: `${obj.text}.${this.prop}` };
    }
    return { value: obj.value[this.prop] };
  }

  public type() {
    // Eventually we should figure out how to evaluate the type
    // of a MemberExpressionNode, but for now we punt to "Any".
    return ExprType.Any;
  }

  public identifiers(): string[] {
    return this.obj.identifiers().map((x) => `${x}.${this.prop}`);
  }
}

export class FuncNode extends ParseNode {
  public readonly func: ExprFunc;
  public args: ParseNode[];

  constructor(func: ExprFunc, args: ParseNode[]) {
    super();
    this.func = func;
    this.args = args;
  }

  public eval(props: EvalProps): any {
    return this.func.eval(this.args.map((x) => x.eval(props)));
  }

  public describeInner(props: DescProps): DescResult {
    let args = this.args.map((x) => x.describeInner(props));
    let collapse = true;
    for(let arg of args) {
      if(arg.text) {
        collapse = false;
      }
    }

    if(collapse) {
      return { value: this.func.eval(args.map((x) => x.value)) };
    }
    args = args.map((x) => x.text || JSON.stringify(x.value));

    if(this.func.op) {
      switch(this.args.length) {
        case 1: {
          return { text: `${this.func.name}${args[0]}` };
        }
        case 2: {
          return { text: `(${args[0]} ${this.func.name} ${args[1]})` };
        }
        return { text: '' };
      }
      return { text: `${this.func.name}(${args.join(', ')})` };
    }
  }

  public type() {
    return this.func.type();
  }

  public identifiers(): string[] {
    return this.args.map((x) => x.identifiers()).flat();
  }
}

export class LiteralNode extends ParseNode {
  constructor() { super(); }
}

export class NumberLiteralNode extends LiteralNode {
  public readonly value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  public eval(props: EvalProps): number {
    return this.value
  }

  public describeInner(props: DescProps): DescResult {
    return { value: this.value };
  }

  public type() {
    return ExprType.Number;
  }
}

export class StringLiteralNode extends LiteralNode {
  public readonly value: string;

  constructor(value: string) {
    super();
    // we must remove all instances of the dice indicator from string literals.
    this.value = value.split(diceIndicator).join('');
  }

  public eval(props: EvalProps): string {
    return this.value
  }

  public describeInner(props: DescProps): DescResult {
    return { value: this.value };
  }

  public type() {
    return ExprType.Text;
  }
}

export class DiceLiteralNode extends LiteralNode {
  public readonly dice: number;
  public readonly size: number;

  constructor(dice: number, size: number) {
    super();
    this.dice = dice;
    this.size = size;
  }

  public eval(props: EvalProps): number {
    let output = 0;
    for(let i = 0; i < this.dice; i++) {
      if(props.forceMin) {
        output++;
      } else if(props.forceMax) {
        output += this.size;
      } else {
        output += Math.floor(Math.random() * this.size);
      }
    }
    return output;
  }

  public describeInner(props: DescProps): DescResult {
    return { text: `${this.dice}d${this.size}` };
  }

  public type() {
    return ExprType.Number;
  }
}

export class IdentifierNode extends ParseNode {
  public readonly name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  public eval(props: EvalProps): any {
    return props.vals[this.name];
  }

  public describeInner(props: DescProps): DescResult {
    if(props.diceOnly) {
      return { value: this.eval(props) };
    }
    return { text: this.name };
  }

  public type() {
    // Eventually we should figure out how to evaluate the type
    // of an IdentifierNode, but for now we punt to "Any".
    return ExprType.Any;
  }

  public identifiers(): string[] {
    return [this.name];
  }
}
