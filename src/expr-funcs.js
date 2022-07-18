class ExpressionFunc {
  constructor(func, evaluateType) {
    this.func = func;
    this.evaluateType = evaluateType;
  }
}

export const floor = new ExpressionFunc(
  Math.floor,
  (argTypes) => {
    if(argTypes.length !== 1) {
      return null;
    }
    if(argTypes[0] === 'integer' || argTypes[0] === 'decimal') {
      return 'integer';
    }
    if(argTypes[0] === 'natural' || argTypes[0] === 'nonnegative') {
      return 'natural';
    }
    return null;
  },
);

export const ceiling = new ExpressionFunc(
  Math.ceil,
  (argTypes) => {
    if(argTypes.length !== 1) {
      return null;
    }
    if(argTypes[0] === 'integer' || argTypes[0] === 'decimal') {
      return 'integer';
    }
    if(argTypes[0] === 'natural' || argTypes[0] === 'nonnegative') {
      return 'natural';
    }
    return null;
  },
);
