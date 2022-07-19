import { Rulebook } from '../src/rulebook';
import { Entity } from '../src/entity';
import { AttributeTypeError } from '../src/errors';

describe('Entity attribute value assignment', () => {
  it('accepts a number in a number attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
    });
    const item = rulebook.create('item', { weight: 5 });
    item.weight = 6;
    expect(item.weight).toBe(6);
  });

  it('rejects a non-number in a number attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
    });
    const item = rulebook.create('item', { weight: 5 });
    expect(() => {
      item.weight = 'foo';
    }).toThrow(AttributeTypeError);
    // did not change anything
    expect(item.weight).toBe(5);
  });

  it('accepts a string in a text attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          desc: {
            type: 'text',
          },
        },
      },
    });
    const item = rulebook.create('item', { desc: 'foo' });
    item.desc = 'bar';
    expect(item.desc).toBe('bar');
  });

  it('rejects a non-string in a text attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          desc: {
            type: 'text',
          },
        },
      },
    });
    const item = rulebook.create('item', { desc: 'foo' });
    expect(() => {
      item.desc = { bar: 'baz' };
    }).toThrow(AttributeTypeError);
    // did not change anything
    expect(item.desc).toBe('foo');
  });

  it('accepts a boolean in a true-false attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          cursed: {
            type: 'true-false',
          },
        },
      },
    });
    const item = rulebook.create('item', { cursed: false });
    item.cursed = true;
    expect(item.cursed).toBe(true);
  });

  it('rejects a non-boolean in a true-false attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          cursed: {
            type: 'true-false',
          },
        },
      },
    });
    const item = rulebook.create('item', { cursed: false });
    expect(() => {
      item.cursed = 5;
    }).toThrow(AttributeTypeError);
    // did not change anything
    expect(item.cursed).toBe(false);
  });

  it('accepts an entity of the correct type in an entity attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      container: {
        attrs: {
          firstThing: {
            type: 'entity',
            entityTypes: ['item'],
          },
        },
      },
      oddity: {},
    });
    const item = rulebook.create('item', { weight: 5 });
    const container = rulebook.create('container');
    container.firstThing = item;
    expect(container.firstThing).toBe(item);
  });

  it('rejects an entity of the wrong type in an entity attribute', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      container: {
        attrs: {
          firstThing: {
            type: 'entity',
            entityTypes: ['item'],
          },
        },
      },
      oddity: {},
    });
    const oddity = rulebook.create('oddity');
    const container = rulebook.create('container');
    expect(() => {
      container.firstThing = oddity;
    }).toThrow(AttributeTypeError);
    // did not change anything
    expect(container.firstThing).toBe(null);
  });

  it('accepts an entity in an entity attribute if it matches any of the entityTypes', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      container: {
        attrs: {
          firstThing: {
            type: 'entity',
            entityTypes: ['item', 'oddity'], // <-- added "oddity"
          },
        },
      },
      oddity: {},
    });
    const oddity = rulebook.create('oddity');
    const container = rulebook.create('container');
    container.firstThing = oddity;
    expect(container.firstThing).toBe(oddity);
  });

  it('accepts list items if all are valid', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      container: {
        attrs: {
          inventory: {
            type: 'entity list',
            entityTypes: ['item'],
          },
        },
      },
      oddity: {},
    });
    const item1 = rulebook.create('item', { weight: 5 });
    const item2 = rulebook.create('item', { weight: 10 });
    const item3 = rulebook.create('item', { weight: 2 });
    const container = rulebook.create('container');

    container.inventory = [item1, item2, item3];

    expect(container.inventory[0]).toBe(item1);
    expect(container.inventory[1]).toBe(item2);
    expect(container.inventory[2]).toBe(item3);
  });

  it('rejects list items if any are invalid', () => {
    const rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      container: {
        attrs: {
          inventory: {
            type: 'entity list',
            entityTypes: ['item'],
          },
        },
      },
      oddity: {},
    });
    const item1 = rulebook.create('item', { weight: 5 });
    const item2 = rulebook.create('oddity');
    const item3 = rulebook.create('item', { weight: 2 });
    const container = rulebook.create('container');

    expect(() => {
      container.inventory = [item1, item2, item3];
    }).toThrow(AttributeTypeError);
    // did not change anything
    expect(container.inventory).toEqual([]);
  });
});
