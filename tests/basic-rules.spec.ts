import { EntityTemplate } from '../src/entity-template';
import { Entity } from '../src/entity';
import basicRules from './basic-rules.json';

for(const name in basicRules) {
  describe(`template for "${name}"`, () => {
    it(`loads "${name}" without erroring`, () => {
      expect(() => {
        new EntityTemplate(name, basicRules[name]);
      }).not.toThrow();
    });
  });
}

describe('creature entity', () => {
  it('loads without erroring', () => {
    const creatureTemplate = new EntityTemplate('creature', basicRules.creature);
    expect(() => {
      new Entity(creatureTemplate, {
        strength: 8,
        dexterity: 14,
        constitution: 13,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      });
    }).not.toThrow();
  });

  it('has correct base stats', () => {
    const creatureTemplate = new EntityTemplate('creature', basicRules.creature);
    const creature = new Entity(creatureTemplate, {
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });
    expect(creature.strength).toEqual(8);
    expect(creature.dexterity).toEqual(14);
    expect(creature.constitution).toEqual(13);
    expect(creature.intelligence).toEqual(15);
    expect(creature.wisdom).toEqual(10);
    expect(creature.charisma).toEqual(12);
  });

  it('has correct derived stats', () => {
    const creatureTemplate = new EntityTemplate('creature', basicRules.creature);
    const creature = new Entity(creatureTemplate, {
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });

    expect(creature.strengthMod).toEqual(-1);
    expect(creature.dexterityMod).toEqual(2);
    expect(creature.constitutionMod).toEqual(1);
    expect(creature.intelligenceMod).toEqual(2);
    expect(creature.wisdomMod).toEqual(0);
    expect(creature.charismaMod).toEqual(1);

    expect(creature.baseArmorClass).toEqual(12);
    expect(creature.armorClass).toEqual(12);

    expect(creature.hitPoints).toEqual(0);
  });

  it('can instantiate 1,000 plain creatures in less than a second', () => {
    // on my computer, this takes around 60 ms. I'm reasonably comfortable
    // saying that if this test does not pass on your hardware, you need new
    // hardware.

    // note that we do NOT require the template to be rebuilt every time.
    // the template is supposed to do most of the heavy lifting here.
    const creatureTemplate = new EntityTemplate('creature', basicRules.creature);

    const start = Date.now(); // millisecs since epoch
    let creatures = [];
    for(let i = 0; i < 1000; i++) {
      creatures.push(new Entity(creatureTemplate, {
        strength: 8,
        dexterity: 14,
        constitution: 13,
        intelligence: 15,
        wisdom: 10,
        charisma: 12,
      }));
    }
    const end = Date.now(); // millisecs since epoch
    expect(end - start).toBeLessThan(1000);
  })
});
