import { EntityTemplate } from '../src/attr';
import basicRules from './basic-rules.json';

for(const name in basicRules) {
  describe(`basic rules element "${name}"`, () => {
    it(`loads "${name}" without erroring`, () => {
      expect(() => {
        new EntityTemplate(name, basicRules[name]);
      }).not.toThrow();
    });
  });
}
