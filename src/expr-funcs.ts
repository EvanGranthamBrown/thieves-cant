import { ParseNode, ExprType } from './expr-base';

interface ExprFuncProps {
  readonly name: string;
  readonly func: Function;
  readonly args: ExprType[][];
  readonly op: boolean;
  readonly returns: ExprType;
}

class ExprFunc {
  public readonly name: string;
  public readonly func: Function;
  public readonly args: ExprType[][];
  public readonly op: boolean;
  public readonly returns: ExprType;

  constructor(args: ExpressionFuncProps) {
    this.name = args.name;
    this.func = args.func;
    this.args = args.args;
    this.op = args.op;
    this.returns = args.returns;
  }

  type() {
    return this.returns;
  }

  eval(args: Any[]) {
    return this.func(args);
  }

  describe() {
    const argString = this.args.map((types) => {
      return types.map((x) => this.describeType(x)).join('|');
    }).join(',');
    return `${this.name}(${argString})`;
  }

  matches(args: ParseNode[]) {
    if(args.length !== this.args.length) {
      return false;
    }
    const argTypes = args.map((x) => x.type());
    for(let i = 0; i < args.length; i++) {
      if(argTypes[i] !== ExprType.Any) {
        let match = false;
        for(let myArgType of this.args[i]) {
          if(argTypes[i] === myArgType || myArgType === ExprType.Any) {
            match = true;
          }
        }
        if(!match) {
          return false;
        }
      }
    }
    return true;
  }
}

const lookup = {
  '+': [
    new ExprFunc({
      name: '+',
      func: (args: number[2]) => args[0] + args[1],
      args: [
        [ExprType.Number],
        [ExprType.Number],
      ],
      op: true,
      returns: ExprType.Number,
    }),
    new ExprFunc({
      name: '+',
      func: (args: (string | number)[2]) => args[0] + args[1],
      args: [
        [ExprType.Number, ExprType.Text],
        [ExprType.Number, ExprType.Text],
      ],
      op: true,
      returns: ExprType.Text,
    }),
  ],
  '-': [
    new ExprFunc({
      name: '-',
      func: (args: number[2]) => args[0] - args[1],
      args: [
        [ExprType.Number],
        [ExprType.Number],
      ],
      op: true,
      returns: ExprType.Number,
    }),
    new ExprFunc({
      name: '-',
      func: (args: number[1]) => -args[0],
      args: [
        [ExprType.Number],
      ],
      op: true,
      returns: ExprType.Number,
    }),
  ],
  '*': [
    new ExprFunc({
      name: '*',
      func: (args: number[2]) => args[0] * args[1],
      args: [
        [ExprType.Number],
        [ExprType.Number],
      ],
      op: true,
      returns: ExprType.Number,
    }),
  ],
  '/': [
    new ExprFunc({
      name: '/',
      func: (args: number[2]) => args[0] / args[1],
      args: [
        [ExprType.Number],
        [ExprType.Number],
      ],
      op: true,
      returns: ExprType.Number,
    }),
  ],
  'floor': [
    new ExprFunc({
      name: 'floor',
      func: (args: number[1]) => Math.floor(args[0]),
      args: [
        [ExprType.Number],
      ],
      op: false,
      returns: ExprType.Number,
    }),
  ],
  'ceil': [
    new ExprFunc({
      name: 'ceil',
      func: (args: number[1]) => Math.ceil(args[0]),
      args: [
        [ExprType.Number],
      ],
      op: false,
      returns: ExprType.Number,
    }),
  ],
  'sum': [
    new ExprFunc({
      name: 'sum',
      func: (args: number[][1]) => {
        let output = 0;
        for(let item of args[0]) {
          output += item;
        }
        return output;
      },
      args: [
        [ExprType.NumberList],
      ],
      op: false,
      returns: ExprType.Number,
    }),
  ],
};

export function findExprFunc(name: string, args: ParseNode[], op: boolean) {
  if(lookup[name]) {
    for(let func of lookup[name]) {
      if(func.matches(args)) {
        return func;
      }
    }
  }
  const descs = args.map((x) => x.describe({}));
  if(op) {
    switch(descs.length) {
      case 0: {
        throw new Error(`Can't process "${name}".`);
      }
      case 1: {
        throw new Error(`Can't process "${name}${descs[0]}".`);
      }
      case 2: {
        throw new Error(`Can't process "${descs[0]} ${name} ${descs[1]}".`);
      }
    }
  }
  throw new Error(`Can't process "${name}(${descs.join(', ')})".`);
}
