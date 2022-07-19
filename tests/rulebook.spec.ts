import { Rulebook } from '../src/rulebook';
import { EntityTemplate } from '../src/entity-template';

describe('Rulebook', () => {
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
  })
  it('generates an entry for each top-level key in the JSON', () => {
    expect(Object.keys(rulebook.entries)).toEqual(['item', 'armor', 'plate']);
  });
  it('generates a template for each entry', () => {
    for(let name in rulebook.entries) {
      expect(rulebook.entries[name].template).toBeInstanceOf(EntityTemplate);
    }
  })
});