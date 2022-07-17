import * as Jsep from 'jsep';

export function parse(str) {
  return Jsep.parse(str);
}

function convertibleToText(type) {
  switch(type) {
    case "text":
    case "natural":
    case "integer":
    case "nonnegative":
    case "decimal": {
      return true;
    }
    default: {
      return false;
    }
  }
}

function isNumeric(type) {
  switch(type) {
    case "natural":
    case "integer":
    case "nonnegative":
    case "decimal": {
      return true;
    }
    default: {
      return false;
    }
  }
}

function combineNumerics(type1, type2) {
  if(type1 === "natural") {
    return type2;
  }
  if(type2 === "natural") {
    return type1;
  }
  if(type1 === "integer") {
    if(type2 === "nonnegative") {
      return "decimal";
    }
    return type2;
  }
  if(type2 === "integer") {
    if(type1 === "nonnegative") {
      return "decimal";
    }
    return type1;
  }
  if(type1 === "nonnegative") {
    return type2;
  }
  if(type2 === "nonnegative") {
    return type1;
  }
  return "decimal";
}

// Very important to use validate on *every* expression when creating a template. Otherwise you
// risk exposing security holes.
export function validate(json, parsed) {
  switch(parsed.type) {
    case 'BinaryExpression': {
      const left = validate(json, parsed.left);
      const right = validate(json, parsed.right);
      switch(parsed.operator) {
        case '+': {
          if(left === 'text' || right === 'text') {
            if(!convertibleToText(left)) {
              throw new Error(`Can't convert ${left} to text.`);
            }
            if(!convertibleToText(right)) {
              throw new Error(`Can't convert ${right} to text.`);
            }
            return 'text';
          } else if(isNumeric(left) && isNumeric(right)) {
            return combineNumerics(left, right);
          } else {
            throw new Error(`Can't evaluate: ${left} + ${right}`)
          }
        }
        case '-': {
          if(isNumeric(left) && isNumeric(right)) {
            const output = combineNumerics(left, right);
            // can never guarantee that - does not return a negative
            switch(output) {
              case 'natural': {
                return 'integer';
              }
              case 'nonnegative': {
                return 'decimal';
              }
              default: {
                return output;
              }
            }
          } else {
            throw new Error(`Can't evaluate: ${left} - ${right}`)
          }
        }
        case '*': {
          if(isNumeric(left) && isNumeric(right)) {
            return combineNumerics(left, right);
          } else {
            throw new Error(`Can't evaluate: ${left} * ${right}`)
          }
        }
        case '/': {
          if(isNumeric(left) && isNumeric(right)) {
            const output = combineNumerics(left, right);
            // can never guarantee that / does not return a fraction
            switch(output) {
              case 'natural': {
                return 'nonnegative';
              }
              case 'integer': {
                return 'decimal';
              }
              default: {
                return output;
              }
            }
          } else {
            throw new Error(`Can't evaluate: ${left} / ${right}`)
          }
        }
        default: {
          throw new Error(`Unknown operator: ${parsed.operator}`)
        }
      }
    }
    case 'Literal': {
      if(typeof parsed.value === 'number') {
        if(parsed.value >= 0) {
          if(Number.isInteger(parsed.value)) {
            return 'natural';
          }
          return 'nonnegative';
        }
        if(Number.isInteger(parsed.value)) {
          return 'integer';
        }
        return 'decimal';
      }
      if(typeof parsed.value === 'string') {
        return 'text';
      }
      return 'entity';
    }
    case 'Identifier': {
      if(!json.data) {
        throw new Error(`Invalid definition: Missing data property.`);
      }
      if(!json.data[parsed.name]) {
        throw new Error(`No definition found for "${parsed.name}".`);
      }
      if(!json.data[parsed.name].type) {
        throw new Error(`Type not specified for "${parsed.name}".`);
      }
      return json.data[parsed.name].type;
    }
    case 'MemberExpression': {
      // to do
      throw new Error(`Not implemented.`);
    }
  }
  console.log(parsed);
  throw new Error('Invalid parse tree.');
}

export function evaluate(obj, parsed) {
  switch(parsed.type) {
    case 'BinaryExpression': {
      const left = evaluate(obj, parsed.left);
      const right = evaluate(obj, parsed.right);
      switch(parsed.operator) {
        case '+': {
          return left + right;
        }
        case '-': {
          return left - right;
        }
        case '*': {
          return left * right;
        }
        case '/': {
          return left / right;
        }
      }
    }
    case 'Literal': {
      return parsed.value;
    }
    case 'Identifier': {
      return obj[parsed.name];
    }
    case 'MemberExpression': {
      return evaluate(obj, parsed.object)[parsed.property.name];
    }
  }
}
