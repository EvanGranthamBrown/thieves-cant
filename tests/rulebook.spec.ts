import { Rulebook } from '../src/rulebook';

describe('Rulebook', () => {
  it('resolves includes', () => {
    const rulebook = new Rulebook({
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
    // write a few real tests here
    expect(Object.keys(rulebook.templates).length).toEqual(3);
  });
});