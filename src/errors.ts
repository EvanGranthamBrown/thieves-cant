// Function for presenting helpful error messages.
// export function errIf(condition: boolean, err: Error, msg: string, parsed: Object) {
//   if(condition) {
//     if(parsed) {
//       throw new err(`Error in "${textify(parsed)}": ${msg}`);
//     } else {
//       throw new err(msg);
//     }
//   }
// }
// export function errUnless(condition: boolean, err: Error, msg: string, parsed: Object) {
//   errIf(!condition, err, msg, parsed);
// }

// function textify(parsed: Object) {
//   if(typeof parsed === 'string') { return parsed; }
//   switch(parsed.type) {
//     case 'BinaryExpression': {
//       return `${textify(parsed.left)} ${parsed.operator} ${textify(parsed.right)}`;
//     }
//     case 'Literal': {
//       return `${parsed.value}`;
//     }
//     case 'Identifier': {
//       return `${parsed.name}`;
//     }
//     case 'MemberExpression': {
//       return `${textify(parsed.object)}.${parsed.property.name}`;
//     }
//     default: {
//       return JSON.stringify(parsed);
//     }
//   }
// }

export class AttributeTypeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AttributeTypeError';
  }
};

export class ExpressionParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExpressionParseError';
  }
};

export class MalformedTemplateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MalformedTemplateError';
  }
};

export class CircularDependencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircularDependencyError';
  }
};
