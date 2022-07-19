import { EntityTemplate } from '../src/entity-template';
import { CircularDependencyError, AttributeTypeError, MalformedTemplateError } from '../src/errors';
import { ExprType } from '../src/expr-base';

describe('EntityTemplate', () => {
  it('runs on a valid template without erroring', () => {
    expect(() => {
      const entity = new EntityTemplate(null, 'creature', {
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
      const entity = new EntityTemplate(null, 'creature', {
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

  it('sets non-calculated attributes to mutable by default', () => {
    const entity = new EntityTemplate(null, 'creature', {
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

    expect(entity.__attrs.dexterity.mutable).toBeTruthy();
  });

  it('sets calculated attributes to immutable', () => {
    const entity = new EntityTemplate(null, 'creature', {
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

    expect(entity.__attrs.dexMod.mutable).toBeFalsy();
  });

  it('respects the mutable flag on non-calculated attributes', () => {
    const entity = new EntityTemplate(null, 'creature', {
      attrs: {
        dexterity: {
          type: 'number',
          mutable: false,
        },
        dexMod: {
          type: 'number',
          calc: 'floor((dexterity - 10) / 2)',
        },
      },
    });

    expect(entity.__attrs.dexterity.mutable).toBeFalsy();
  });

  it('errors if the mutable flag is set on a calculated attribute', () => {
    expect(() => {
      const entity = new EntityTemplate(null, 'creature', {
        attrs: {
          dexterity: {
            type: 'number',
          },
          dexMod: {
            type: 'number',
            calc: 'floor((dexterity - 10) / 2)',
            mutable: true,
          },
        },
      });
    }).toThrow(MalformedTemplateError);
  });

  it('computes dependencies properly', () => {
    const entity = new EntityTemplate(null, 'creature', {
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
      { to: entity.__attrs.dexterity, from: entity.__attrs.dexMod, marked: false },
    ]);

    expect(entity.__attrs.initiative.depends).toEqual([
      { to: entity.__attrs.dexMod, from: entity.__attrs.initiative, marked: false },
    ]);

    expect(entity.__attrs.baseArmorClass.depends).toEqual([
      { to: entity.__attrs.dexMod, from: entity.__attrs.baseArmorClass, marked: false },
    ]);
  });

  it('computes reverse dependencies properly', () => {
    const entity = new EntityTemplate(null, 'creature', {
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

    expect(entity.__attrs.dexterity.dependedBy).toEqual([
      { to: entity.__attrs.dexterity, from: entity.__attrs.dexMod, marked: false },
    ]);

    expect(entity.__attrs.dexMod.dependedBy).toEqual([
      { to: entity.__attrs.dexMod, from: entity.__attrs.initiative, marked: false },
      { to: entity.__attrs.dexMod, from: entity.__attrs.baseArmorClass, marked: false },
    ]);

    expect(entity.__attrs.initiative.dependedBy).toEqual([
    ]);

    expect(entity.__attrs.baseArmorClass.dependedBy).toEqual([
    ]);
  });

  it('errors on a circular dependency', () => {
    expect(() => {
      const entity = new EntityTemplate(null, 'creature', {
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
