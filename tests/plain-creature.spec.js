import { createTemplate } from '../src/index';
import basicRules from './basic-rules.json';

describe('plain creature', () => {
  it('loads without error', () => {
    expect(() => {
      const Creature = createTemplate(basicRules.creature);
    }).not.toThrow();
  });

  it('creates an instance without error', () => {
    const Creature = createTemplate(basicRules.creature);
    expect(() => {
      const creature = new Creature({
        maxHitPoints: 10,
        hitPoints: 10,
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).not.toThrow();
  });

  it('assigns data values', () => {
    const Creature = createTemplate(basicRules.creature);
    const creature = new Creature({
      maxHitPoints: 10,
      hitPoints: 10,
      strength: 8,
      dexterity: 13,
      constitution: 14,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });
    expect(creature.strength).toEqual(8);
  });

  it('assigns default data values when not specified', () => {
    const Creature = createTemplate(basicRules.creature);
    const creature = new Creature({
      maxHitPoints: 10,
      // hit points should default to maxHitPoints
      strength: 8,
      dexterity: 13,
      constitution: 14,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });
    expect(creature.hitPoints).toEqual(10);
  });

  it('errors when not given a value for a data prop with no default', () => {
    const Creature = createTemplate(basicRules.creature);
    expect(() => {
      const creature = new Creature({
        // maxHitPoints has no default - should error
        hitPoints: 10,
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).toThrow();
  });

  it('errors when given a non-number in a property of type "natural"', () => {
    const Creature = createTemplate(basicRules.creature);
    expect(() => {
      const creature = new Creature({
        maxHitPoints: "foo",
        hitPoints: 10,
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).toThrow();
  });

  it('errors when given a non-integer in a property of type "natural"', () => {
    const Creature = createTemplate(basicRules.creature);
    expect(() => {
      const creature = new Creature({
        maxHitPoints: 10.5,
        hitPoints: 10,
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).toThrow();
  });

  it('errors when given a negative number in a property of type "natural"', () => {
    const Creature = createTemplate(basicRules.creature);
    expect(() => {
      const creature = new Creature({
        maxHitPoints: -2,
        hitPoints: 10,
        strength: 8,
        dexterity: 13,
        constitution: 14,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).toThrow();
  });

  // it('correctly computes values', () => {
  //   const Creature = createTemplate(basicRules.creature);
  //   const creature = new Creature({
  //     maxHitPoints: 10,
  //     hitPoints: 10,
  //     strength: 8,
  //     dexterity: 13,
  //     constitution: 14,
  //     intelligence: 15,
  //     wisdom: 10,
  //     charisma: 12,
  //   });
  //   expect(creature.dexterityMod).toEqual(1);
  // });
});
