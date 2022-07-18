import { errIf, MalformedTemplateError } from './errors';

// Identifies dice expressions ("1d20", "10d6", etc.).
const diceExpressionRegex = /([0-9]+[dD][0-9]+)/g;
const diceIndicator = '_@@';

// Prepend @@_ to all dice expressions, so the parser can recognize them.
export function addDiceIndicators(str) {
  errIf(
    str.includes(diceIndicator),
    MalformedTemplateError,
    `Expressions may not include the text "${diceIndicator}".`,
    str,
  );
  return str.replaceAll(diceExpressionRegex, `${diceIndicator}$1`);
}

// Remove the dice indicator from inside string literals in the parse tree.
// Convert dice expressions into a special literal type.
export function processDiceIndicators(parsed) {
  switch(parsed.type) {
    case 'BinaryExpression': {
      processDiceIndicators(parsed.left);
      processDiceIndicators(parsed.right);
      break;
    }
    case 'Literal': {
      if(typeof parsed.value === 'string') {
        parsed.value = parsed.value.split(diceIndicator).join('');
      }
      break;
    }
    case 'Identifier': {
      const dice = diceExpressionFrom(parsed.name);
      if(dice) {
        parsed.type = 'DiceLiteral';
        parsed.dice = dice[0];
        parsed.size = dice[1];
      }
    }
  }
}

function diceExpressionFrom(str) {
  if(str.substring(0, diceIndicator.length) === diceIndicator) {
    const expr = str.substring(diceIndicator.length).toLowerCase().split('d');
    return expr.map((x) => Number(x));
  }
  return null;
}
