import { EntityTemplate } from '../src/entity-template';
import { CircularDependencyError, AttributeTypeError } from '../src/errors';
import { ExprType } from '../src/expr-base';

describe('EntityTemplate', () => {
  it('runs on a valid template without erroring', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          dexterity: {
            type: 'number',
          },
          dexMod: {
            type: 'number',
            calc: 'floor((dexterity - 10) / 2)',
          },
        },
      });
    }).not.toThrow();
  });

  it('errors when an attribute type does not match its calc formula', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          dexterity: {
            type: 'number',
          },
          dexMod: {
            type: 'text',
            calc: 'floor((dexterity - 10) / 2)',
          },
        },
      });
    }).toThrow(AttributeTypeError);
  });

  it('computes dependencies properly', () => {
    const entity = new EntityTemplate('creature', {
      attrs: {
        dexterity: {
          type: 'number',
        },
        dexMod: {
          type: 'number',
          calc: 'floor((dexterity - 10) / 2)',
        },
        initiative: {
          type: 'number',
          calc: '1d20 + dexMod',
        },
        baseArmorClass: {
          type: 'number',
          calc: '10 + dexMod',
        },
      },
    });

    expect(entity.__attrs.dexterity.depends).toEqual([
    ]);

    expect(entity.__attrs.dexMod.depends).toEqual([
      { attr: entity.__attrs.dexterity, reverseAttr: entity.__attrs.dexMod, marked: false },
    ]);

    expect(entity.__attrs.initiative.depends).toEqual([
      { attr: entity.__attrs.dexMod, reverseAttr: entity.__attrs.initiative, marked: false },
    ]);

    expect(entity.__attrs.baseArmorClass.depends).toEqual([
      { attr: entity.__attrs.dexMod, reverseAttr: entity.__attrs.baseArmorClass, marked: false },
    ]);
  });

  it('computes reverse dependencies properly', () => {
    const entity = new EntityTemplate('creature', {
      attrs: {
        dexterity: {
          type: 'number',
        },
        dexMod: {
          type: 'number',
          calc: 'floor((dexterity - 10) / 2)',
        },
        initiative: {
          type: 'number',
          calc: '1d20 + dexMod',
        },
        baseArmorClass: {
          type: 'number',
          calc: '10 + dexMod',
        },
      },
    });

    expect(entity.__attrs.dexterity.reverseDepends).toEqual([
      { attr: entity.__attrs.dexterity, reverseAttr: entity.__attrs.dexMod, marked: false },
    ]);

    expect(entity.__attrs.dexMod.reverseDepends).toEqual([
      { attr: entity.__attrs.dexMod, reverseAttr: entity.__attrs.initiative, marked: false },
      { attr: entity.__attrs.dexMod, reverseAttr: entity.__attrs.baseArmorClass, marked: false },
    ]);

    expect(entity.__attrs.initiative.reverseDepends).toEqual([
    ]);

    expect(entity.__attrs.baseArmorClass.reverseDepends).toEqual([
    ]);
  });

  it('errors on a circular dependency', () => {
    expect(() => {
      const entity = new EntityTemplate('creature', {
        attrs: {
          strMod: {
            type: 'number',
          },
          challengeRating: {
            type: 'number',
            calc: 'floor(attackMod / 5)'
          },
          profBonus: {
            type: 'number',
            calc: 'floor((challengeRating + 5) / 4)',
          },
          attackMod: {
            type: 'number',
            calc: 'profBonus + strMod',
          },
        },
      });
    }).toThrow(CircularDependencyError);
  });
});
