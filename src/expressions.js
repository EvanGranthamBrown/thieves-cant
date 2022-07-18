import * as Jsep from 'jsep';
Jsep.addIdentifierChar('@');

import { findType } from './type-logic';
import { addDiceIndicators, processDiceIndicators } from './dice';

export function parse(str) {
  let output = Jsep.parse(addDiceIndicators(str));
  processDiceIndicators(output);
  return output;
}

// Very important to use validate on *every* expression when creating a template. Otherwise you
// risk exposing security holes.
export function validate(json, parsed) {
  return findType(json, parsed);
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
    case 'DiceLiteral': {
      return { dice: parsed.dice, size: parsed.size };
    }
    case 'Identifier': {
      return obj[parsed.name];
    }
    case 'MemberExpression': {
      throw new Error(`Member expressions not yet supported.`);
    }
  }
}
