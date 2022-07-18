import { errIf, errUnless, TypeError, MalformedTemplateError } from './errors';
import * as ExprFuncs from './expr-funcs';

export function valid(type) {
  switch(type) {
    case 'text':
    case 'natural':
    case 'integer':
    case 'nonnegative':
    case 'decimal':
    case 'entity':
    case 'dice': {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function validText(type) {
  switch(type) {
    case 'text':
    case 'natural':
    case 'integer':
    case 'nonnegative':
    case 'decimal':
    case 'dice': {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function validNumber(type) {
  switch(type) {
    case 'natural':
    case 'integer':
    case 'nonnegative':
    case 'decimal': {
      return true;
    }
    default: {
      return false;
    }
  }
}

export function validDice(type) {
  switch(type) {
    case 'natural':
    case 'integer':
    case 'dice': {
      return true;
    }
    default: {
      return false;
    }
  }
}

function textOperator(operator) {
  switch(operator) {
    case '+': {
      return true;
    }
    default: {
      return false;
    }
  }
}

function numberOperator(operator) {
  switch(operator) {
    case '+':
    case '-':
    case '*':
    case '/': {
      return true;
    }
    default: {
      return false;
    }
  }
}

function diceOperator(operator) {
  switch(operator) {
    case '+':
    case '-': {
      return true;
    }
    default: {
      return false;
    }
  }
}

function combinedInteger(type1, type2, operator) {
  if(type1 !== 'integer' && type1 !== 'natural') { return false; }
  if(type2 !== 'integer' && type2 !== 'natural') { return false; }
  if(operator === '/') { return false; }
  return true;
}

function combinedNonnegative(type1, type2, operator) {
  if(type1 !== 'nonnegative' && type1 !== 'natural') { return false; }
  if(type2 !== 'nonnegative' && type2 !== 'natural') { return false; }
  if(operator === '-') { return false; }
  return true;
}

function combineTypes(type1, type2, operator, parsed) {
  const errMsg = `Can't compute "${type1} ${operator} ${type2}".`;

  if(type1 === 'text' || type2 === 'text') {
    errUnless(
      validText(type1) && validText(type2) && textOperator(operator),
      TypeError,
      errMsg,
      parsed,
    );
    return 'text';
  }

  if(type1 === 'dice' || type2 === 'dice') {
    errUnless(
      validDice(type1) && validDice(type2) && diceOperator(operator),
      TypeError,
      errMsg,
      parsed,
    );
    return 'dice';
  }

  if(validNumber(type1) || validNumber(type2)) {
    errUnless(
      validNumber(type1) && validNumber(type2) && numberOperator(operator),
      TypeError,
      errMsg,
      parsed,
    );
    if(combinedInteger(type1, type2, operator)) {
      if(combinedNonnegative(type1, type2, operator)) {
        return 'natural';
      }
      return 'integer';
    }
    if(combinedNonnegative(type1, type2, operator)) {
      return 'nonnegative';
    }
    return 'decimal';
  }

  errIf(true, TypeError, errMsg, parsed);
}

function literalType(lit) {
  if(typeof lit === 'number') {
    if(lit >= 0) {
      if(Number.isInteger(lit)) {
        return 'natural';
      }
      return 'nonnegative';
    }
    if(Number.isInteger(lit)) {
      return 'integer';
    }
    return 'decimal';
  }
  if(typeof lit === 'string') {
    return 'text';
  }
  return 'entity';
}

function identifierType(identifier, json, parsed) {
  if(identifier.substring(0, 3) === '@@_') {
    // This is a dice expression.
    return 'dice';
  }
  errIf(
    (json.data === undefined) || (json.data[identifier] === undefined),
    MalformedTemplateError,
    `Unknown property "${identifier}".`,
    parsed
  );
  errIf(
    json.data[identifier].type === undefined,
    MalformedTemplateError,
    `Missing type for property "${identifier}".`,
    parsed
  );
  errUnless(
    valid(json.data[identifier].type),
    MalformedTemplateError,
    `Invalid type for property "${identifier}": "${json.data[identifier].type}".`,
    parsed
  );
  return json.data[identifier].type;
}

function functionType(func, json, parsed) {
  errUnless(
    ExprFuncs[func],
    MalformedTemplateError,
    `Unknown function: "${func}".`,
    parsed,
  );

  const args = parsed.arguments.map((x) => findType(json, x));
  const output = ExprFuncs[func].evaluateType(args);

  errUnless(
    output,
    TypeError,
    `Can't compute "${func}(${args.join(', ')})".`,
    parsed,
  );
  return output;
}

export function findType(json, parsed) {
  switch(parsed.type) {
    case 'BinaryExpression': {
      return combineTypes(
        findType(json, parsed.left),
        findType(json, parsed.right),
        parsed.operator,
        parsed,
      );
    }
    case 'UnaryExpression': {
      const arg = findType(json, parsed.argument);
      if(parsed.operator === '-') {
        if(arg === 'natural') {
          return 'integer';
        }
        if(arg === 'nonnegative') {
          return 'decimal';
        }
      }
      return arg;
    }
    case 'Literal': {
      return literalType(parsed.value);
    }
    case 'DiceLiteral': {
      return 'dice';
    }
    case 'Identifier': {
      return identifierType(parsed.name, json, parsed);
    }
    case 'CallExpression': {
      return functionType(parsed.callee.name, json, parsed);
    }
    case 'MemberExpression': {
      errIf(true, MalformedTemplateError, `System does not yet support multiple dot expressions.`);
    }
    default: {
      errIf(true, MalformedTemplateError, `System does not yet support evaluating: ${JSON.stringify(parsed)}.`);
    }
  }
}
