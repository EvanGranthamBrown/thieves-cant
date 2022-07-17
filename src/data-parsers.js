export function decimal(val, prop) {
  const result = Number(val);
  if(isNaN(result)) {
    throw new Error(`Invalid value for "${prop}": ${val} (must be a number)`);
  }
  return result;
}

export function integer(val, prop) {
  const result = Number(val);
  if(isNaN(result) || !Number.isInteger(result)) {
    throw new Error(`Invalid value for "${prop}": ${val} (must be an integer)`);
  }
  return result;
}

export function natural(val, prop) {
  const result = Number(val);
  if(isNaN(result) || !Number.isInteger(result) || result < 0) {
    throw new Error(`Invalid value for "${prop}": ${val} (must be a non-negative integer)`);
  }
  return result;
}

export function text(val, prop) {
  return String(val);
}
