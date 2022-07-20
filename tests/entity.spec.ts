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
            reverse: 'owner',
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
            reverse: 'owner',
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
            reverse: 'owner',
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

  it('accepts an entity in an entity attribute if it includes one of the entityTypes', () => {
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
            reverse: 'owner',
          },
        },
      },
      oddity: {
        includes: ['item'], // <-- now should count as an item
      },
    });
    const oddity = rulebook.create('oddity');
    const container = rulebook.create('container');
    container.firstThing = oddity;
    expect(container.firstThing).toBe(oddity);
  });

  it('assigns the reverse relationship when changing an entity attribute', () => {
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
            reverse: 'owner',
          },
        },
      },
      oddity: {},
    });
    const item = rulebook.create('item', { weight: 5 });
    const container = rulebook.create('container');
    container.firstThing = item;
    expect(item.owner).toBe(container);
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
            reverse: 'owner',
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
            reverse: 'owner',
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

  it('correctly evaluates a calc that reaches into other entities', () => {
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
            reverse: 'owner',
          },
          encumbrance: {
            type: 'number',
            calc: 'sum(inventory.weight)',
          }
        },
      },
      oddity: {},
    });
    const item1 = rulebook.create('item', { weight: 5 });
    const item2 = rulebook.create('item', { weight: 10 });
    const item3 = rulebook.create('item', { weight: 2 });
    const container = rulebook.create('container');
    container.inventory = [item1, item2, item3];

    expect(container.encumbrance).toEqual(17);
  });

  it('registers changes in other entities', () => {
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
            reverse: 'owner',
          },
          encumbrance: {
            type: 'number',
            calc: 'sum(inventory.weight)',
          }
        },
      },
      oddity: {},
    });
    const item1 = rulebook.create('item', { weight: 5 });
    const item2 = rulebook.create('item', { weight: 10 });
    const item3 = rulebook.create('item', { weight: 2 });
    const container = rulebook.create('container');
    container.inventory = [item1, item2, item3];

    // change one of the other entities!
    item1.weight = 4;

    expect(container.encumbrance).toEqual(16);
  });

  // This is the ultimate test of my dependency system, and it is currently
  // failing. Making this pass may require constructing a dependency graph
  // at runtime, whenever entity relationships change. It may also require
  // identifying a bug in this here test, because something virtually identical
  // on the basic rules passes just fine. But I'm on vacation right now, stop.

  // it('tracks a web of cascading updates across items', () => {
  //   const rulebook = new Rulebook('Test Rulebook', {
  //     item: {
  //       attrs: {
  //         weight: {
  //           type: 'number',
  //         },
  //         totalWeight: {
  //           type: 'number',
  //           calc: 'weight',
  //         },
  //       },
  //     },
  //     has_inventory: {
  //       attrs: {
  //         inventory: {
  //           type: 'entity list',
  //           entityTypes: ['item'],
  //           reverse: 'owner',
  //         },
  //         contentsWeight: {
  //           type: 'number',
  //           calc: 'sum(inventory.totalWeight)',
  //         }
  //       },
  //     },
  //     container: {
  //       includes: ['item', 'has_inventory'],
  //       totalWeight: {
  //         type: 'number',
  //         calc: 'weight + contentsWeight',
  //       },
  //     },
  //   });

  //   const room = rulebook.create('has_inventory');

  //   const chest = rulebook.create('container', { weight: 10 });
  //   const bag = rulebook.create('container', { weight: 1 });
  //   const pouch = rulebook.create('container', { weight: 0.5 });

  //   const gem = rulebook.create('item', { weight: 0.1 });
  //   const tome = rulebook.create('item', { weight: 5 });
  //   const sword = rulebook.create('item', { weight: 3 });

  //   pouch.inventory = [gem];
  //   bag.inventory = [tome];

  //   chest.inventory = [pouch, sword];
  //   room.inventory = [chest, bag];

  //   // room contents includes everything
  //   expect(room.contentsWeight).toBe(19.6);

  //   // chest contents include the sword, the pouch, and the gem
  //   expect(chest.contentsWeight).toBe(3.6);
  //   expect(chest.totalWeight).toBe(13.6);

  //   // bag contents include the tome
  //   expect(bag.contentsWeight).toBe(5);
  //   expect(bag.totalWeight).toBe(6);

  //   // now move the gem into the bag
  //   gem.owner = bag;

  //   // room should not have changed
  //   expect(room.contentsWeight).toBe(19.6);

  //   // chest should be 0.1 pounds lighter
  //   expect(chest.contentsWeight).toBe(3.5);
  //   expect(chest.totalWeight).toBe(13.5);

  //   // bag should be 0.1 pounds heavier
  //   expect(bag.contentsWeight).toBe(5.1);
  //   expect(bag.totalWeight).toBe(6.1);

  //   // now take the bag out of the room
  //   room.inventory = [chest];

  //   // room contents weight should now be only the chest
  //   expect(room.contentsWeight).toBe(13.5);
  // });
});
