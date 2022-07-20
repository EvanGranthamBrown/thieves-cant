import { EntityTemplate } from '../src/entity-template';
import { Entity } from '../src/entity';
import basicRulesJson from './basic-rules.json';
import { Rulebook } from '../src/rulebook';

let basicRules: Rulebook;
beforeEach(() => {
  basicRules = new Rulebook('Basic Rules', basicRulesJson);
});

describe('basic rules entries', () => {
  it('builds in less than a second', () => {
    const start = Date.now(); // millisecs since epoch
    new Rulebook('Basic Rules', basicRulesJson);
    const end = Date.now(); // millisecs since epoch
    expect(end - start).toBeLessThan(1000);
  });
  for(const name in basicRulesJson) {
    it(`has a template for "${name}"`, () => {
      expect(basicRules.entries[name].template).toBeInstanceOf(EntityTemplate);
    });
  }
});

describe('creatures with containers', () => {
  it('computes encumbrance through multiple container levels', () => {
    const creature = basicRules.create('creature', {
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });
    const backpack = basicRules.create('container', {
      weight: 2,
    });
    const box = basicRules.create('container', {
      weight: 1,
    });
    const egg = basicRules.create('item', {
      weight: 0.1,
    });

    creature.inventory = [backpack];
    backpack.inventory = [box];
    egg.holder = box;
    expect(creature.encumbrance).toEqual(3.1);
  });
});

describe('creature entity', () => {
  it('loads without erroring', () => {
    expect(() => {
      const creature = basicRules.create('creature', {
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
    const creature = basicRules.create('creature', {
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
    const creature = basicRules.create('creature', {
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

  it('changes derived stats when the base values change', () => {
    const creature = basicRules.create('creature', {
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 15,
      wisdom: 10,
      charisma: 12,
    });

    creature.dexterity = 16;
    // dexterityMod, baseArmorClass, armorClass should all go up 1

    expect(creature.dexterityMod).toEqual(3);
    expect(creature.baseArmorClass).toEqual(13);
    expect(creature.armorClass).toEqual(13);
  });

  it('can instantiate 1,000 plain creatures in less than a second', () => {
    // note that we do NOT require the template to be rebuilt every time.
    // the template is supposed to do most of the heavy lifting here.

    const start = Date.now(); // millisecs since epoch
    let creatures = [];
    for(let i = 0; i < 1000; i++) {
      creatures.push(basicRules.create('creature', {
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
  });

  it('tracks a web of cascading updates across items', () => {
    const room = basicRules.create('container', { weight: 0 });

    const chest = basicRules.create('container', { weight: 10 });
    const bag = basicRules.create('container', { weight: 1 });
    const pouch = basicRules.create('container', { weight: 0.5 });

    const gem = basicRules.create('item', { weight: 0.1 });
    const tome = basicRules.create('item', { weight: 5 });
    const sword = basicRules.create('item', { weight: 3 });

    pouch.inventory = [gem];
    bag.inventory = [tome];

    chest.inventory = [pouch, sword];
    room.inventory = [chest, bag];

    // room contents includes everything
    expect(room.totalWeight).toBe(19.6);

    // chest contents include the sword, the pouch, and the gem
    expect(chest.totalWeight).toBe(13.6);

    // bag contents include the tome
    expect(bag.totalWeight).toBe(6);

    // now move the gem into the bag
    gem.holder = bag;

    // room should not have changed
    expect(room.totalWeight).toBe(19.6);

    // chest should be 0.1 pounds lighter
    expect(chest.totalWeight).toBe(13.5);

    // bag should be 0.1 pounds heavier
    expect(bag.totalWeight).toBe(6.1);

    // now take the bag out of the room
    room.inventory = [chest];

    // room contents weight should now be only the chest
    expect(room.totalWeight).toBe(13.5);
  });
});
