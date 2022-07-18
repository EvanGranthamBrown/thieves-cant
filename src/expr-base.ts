export enum ExprType {
  Number = 'number',
  Text = 'text',
  Entity = 'entity',
  TrueFalse = 'true-false',

  NumberList = 'number list',
  TextList = 'text list',
  EntityList = 'entity list',
  TrueFalseList = 'true-false list',

  Any = 'any',
}

export class ParseNode {
  constructor() {}

  public eval(props: EvalProps): any {
    return null;
  }

  public describe(props: EvalProps): string {
    const output = this.describeInner(props);
    const str = output.text || String(output.value);
    if(str[0] === '(' && str[str.length - 1] === ')') {
      return str.substring(1, str.length - 1);
    }
    return str;
  }

  public describeInner(props: DescProps): DescResult {
    return '';
  }

  public type() {
    return ExprType.Any;
  }

  public identifiers(): string[] {
    return [];
  }
}

export interface EvalProps {
  readonly vals: Record<string, any>;
  readonly adv?: boolean;
  readonly disadv?: boolean;
  readonly forceMin?: boolean;
  readonly forceMax?: boolean;
}

export interface DescProps extends EvalProps {
  readonly diceOnly?: boolean;
}

export interface DescResult {
  readonly value?: any;
  readonly text?: string;
}