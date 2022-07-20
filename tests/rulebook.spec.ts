import { Rulebook, RulebookEntry } from '../src/rulebook';
import { EntityTemplate } from '../src/entity-template';
import { Entity } from '../src/entity';
import { ExprType } from '../src/expr-base';
import { InternalError, MalformedTemplateError } from '../src/errors';

let rulebook: Rulebook;

beforeEach(() => {
  rulebook = new Rulebook('Test Rulebook', {
    item: {
      attrs: {
        weight: {
          type: 'number',
        },
      },
    },
    armor: {
      includes: ['item'],
      attrs: {
        baseArmorClass: {
          type: 'number',
        },
      },
    },
    plate: {
      includes: ['armor'],
      attrs: {
        weight: {
          calc: '65',
        },
        baseArmorClass: {
          calc: '18',
        },
      },
    },
  });
});

describe('Rulebook constructor', () => {
  it('generates an entry for each top-level key in the JSON', () => {
    expect(Object.keys(rulebook.entries)).toEqual(['item', 'armor', 'plate']);
  });
  it('generates a template for each entry', () => {
    for(let name in rulebook.entries) {
      expect(rulebook.entries[name].template).toBeInstanceOf(EntityTemplate);
    }
  });
  it('generates the correct template attributes for an entry without includes', () => {
    const item = rulebook.entries.item.template;

    expect(Object.keys(item.__attrs).length).toEqual(1); // weight

    expect(item.__attrs.weight.type).toEqual(ExprType.Number);
    expect(item.__attrs.weight.calc).toEqual(undefined);
  });
  it('an entry without includes matches only itself', () => {
    const item = rulebook.entries.item.template;

    expect(item.__is('item')).toBeTruthy();
    expect(item.__is('armor')).toBeFalsy();
    expect(item.__is('plate')).toBeFalsy();
    expect(item.__is('flumph')).toBeFalsy();
  });
  it('generates the correct template attributes for an entry with a simple include', () => {
    const armor = rulebook.entries.armor.template;

    expect(Object.keys(armor.__attrs).length).toEqual(2); // weight, baseArmorClass

    expect(armor.__attrs.weight.type).toEqual(ExprType.Number);
    expect(armor.__attrs.weight.calc).toEqual(undefined);

    expect(armor.__attrs.baseArmorClass.type).toEqual(ExprType.Number);
    expect(armor.__attrs.baseArmorClass.calc).toEqual(undefined);
  });
  it('an entry with a simple include matches itself and its include', () => {
    const armor = rulebook.entries.armor.template;

    expect(armor.__is('item')).toBeTruthy();
    expect(armor.__is('armor')).toBeTruthy();
    expect(armor.__is('plate')).toBeFalsy();
    expect(armor.__is('flumph')).toBeFalsy();
  });
  it('generates the correct template attributes for an entry with transitive includes', () => {
    const plate = rulebook.entries.plate.template;

    expect(Object.keys(plate.__attrs).length).toEqual(2); // weight, baseArmorClass

    expect(plate.__attrs.weight.type).toEqual(ExprType.Number);
    expect(plate.__attrs.weight.calc.eval({})).toEqual(65);

    expect(plate.__attrs.baseArmorClass.type).toEqual(ExprType.Number);
    expect(plate.__attrs.baseArmorClass.calc.eval({})).toEqual(18);
  });
  it('an entry with transitive includes matches itself and its whole include chain', () => {
    const plate = rulebook.entries.plate.template;

    expect(plate.__is('item')).toBeTruthy();
    expect(plate.__is('armor')).toBeTruthy();
    expect(plate.__is('plate')).toBeTruthy();
    expect(plate.__is('flumph')).toBeFalsy();
  });
  it('does type checking on its inputs (compensating for TypeScript loss of type info on mixin)', () => {
    expect(() => {
      // missing name
      new Rulebook({ item: {} });
    }).toThrow(InternalError);
    expect(() => {
      // name is not a string
      new Rulebook(2, { item: {} });
    }).toThrow(InternalError);
    expect(() => {
      // missing json
      new Rulebook("Rulebook");
    }).toThrow(InternalError);
    expect(() => {
      // json is not object type
      new Rulebook("Rulebook", 5);
    }).toThrow(InternalError);
    expect(() => {
      // json is null
      new Rulebook("Rulebook", null);
    }).toThrow(InternalError);
  });
  it('creates a reverse for an entity-typed attribute, with defaults', () => {
    rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      trinket: {},
      container: {
        attrs: {
          inventory: {
            type: 'entity list',
            entityTypes: ['item', 'trinket'],
            reverse: 'owner',
          },
        },
      },
      oddity: {},
    });
    const item = rulebook.entries.item.template;
    const trinket = rulebook.entries.trinket.template;

    expect(item.__attrs.owner.type).toEqual(ExprType.Entity);
    expect(item.__attrs.owner.entityTypes).toEqual(['container']);

    expect(trinket.__attrs.owner.type).toEqual(ExprType.Entity);
    expect(trinket.__attrs.owner.entityTypes).toEqual(['container']);
  });
  it('respects specified reverseType and reverseEntityTypes when present', () => {
    rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
        },
      },
      trinket: {},
      container: {
        attrs: {
          inventory: {
            type: 'entity list',
            entityTypes: ['item', 'trinket'],
            reverse: 'owner',
            reverseType: 'entity list',
            reverseEntityTypes: ['container', 'oddity'],
          },
        },
      },
      oddity: {},
    });
    const item = rulebook.entries.item.template;
    const trinket = rulebook.entries.trinket.template;

    expect(item.__attrs.owner.type).toEqual(ExprType.EntityList);
    expect(item.__attrs.owner.entityTypes).toEqual(['container', 'oddity']);

    expect(trinket.__attrs.owner.type).toEqual(ExprType.EntityList);
    expect(trinket.__attrs.owner.entityTypes).toEqual(['container', 'oddity']);
  });
  it('respects an existing reverse when present', () => {
    rulebook = new Rulebook('Test Rulebook', {
      item: {
        attrs: {
          weight: {
            type: 'number',
          },
          // define an owner attribute on item; its properties should remain
          // unchanged
          owner: {
            type: 'entity list',
            entityTypes: ['container', 'oddity'],
            reverse: 'inventory',
          },
        },
      },
      trinket: {},
      container: {
        attrs: {
          inventory: {
            type: 'entity list',
            entityTypes: ['item', 'trinket'],
            reverse: 'owner',
          },
        },
      },
      oddity: {},
    });
    const item = rulebook.entries.item.template;
    const trinket = rulebook.entries.trinket.template;

    expect(item.__attrs.owner.type).toEqual(ExprType.EntityList);
    expect(item.__attrs.owner.entityTypes).toEqual(['container', 'oddity']);

    // the trinket property had no owner attribute defined, so it gets the
    // default values.
    expect(trinket.__attrs.owner.type).toEqual(ExprType.Entity);
    expect(trinket.__attrs.owner.entityTypes).toEqual(['container']);
  });
  it('errors when an entity-typed attribute lacks a "reverse" property', () => {
    expect(() => {
      new Rulebook('Test Rulebook', {
        item: {
          attrs: {
            weight: {
              type: 'number',
            },
          },
        },
        trinket: {},
        container: {
          attrs: {
            inventory: {
              type: 'entity list',
              entityTypes: ['item', 'trinket'],
              // reverse: 'owner',
            },
          },
        },
        oddity: {},
      });
    }).toThrow(MalformedTemplateError);
  });
  it('errors when there is a conflict between a reverse and an existing property', () => {
    expect(() => {
      new Rulebook('Test Rulebook', {
        item: {
          attrs: {
            weight: {
              type: 'number',
            },
            // define an owner attribute on item
            owner: {
              type: 'entity',
              // note the entity types
              entityTypes: ['container', 'oddity'],
              reverse: 'inventory',
            },
          },
        },
        trinket: {},
        container: {
          attrs: {
            inventory: {
              type: 'entity list',
              entityTypes: ['item', 'trinket'],
              reverse: 'owner',
              // reverseEntityTypes does not match item.owner.entityTypes - error
              reverseEntityTypes: ['container'],
            },
          },
        },
        oddity: {},
      });
    }).toThrow(MalformedTemplateError);
  });
});

describe('Rulebook.addEntry', () => {
  it('creates a new entry', () => {
    rulebook.addEntry('studded_leather', {
      includes: ['armor'],
      attrs: {
        weight: {
          calc: '13',
        },
        baseArmorClass: {
          calc: '12',
        },
      },
    });
    expect(rulebook.entries.studded_leather).toBeInstanceOf(RulebookEntry);
  });
});

describe('Rulebook.removeEntry', () => {
  it('removes an entry', () => {
    rulebook.removeEntry('plate');
    expect(rulebook.entries.plate).toBeUndefined();
  });
});

describe('Rulebook.create', () => {
  it('instantiates the appropriate object', () => {
    const plate = rulebook.create('plate');
    expect(plate).toBeInstanceOf(Entity);
    expect(plate.__name).toBe('plate');
    expect(plate.weight).toEqual(65);
    expect(plate.baseArmorClass).toEqual(18);
  });

  it('passes data values into the new object', () => {
    const item = rulebook.create('item', { weight: 5 });
    expect(item.weight).toEqual(5);
  });
});

