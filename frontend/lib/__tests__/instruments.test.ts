import {
  INSTRUMENTS,
  DEFAULT_INSTRUMENT_ID,
  getInstrument,
  getInstrumentOrDefault,
} from '../instruments';

describe('instruments', () => {
  describe('INSTRUMENTS', () => {
    it('contains instruments', () => {
      expect(INSTRUMENTS.length).toBeGreaterThan(0);
    });

    it('each instrument has id, label, digits', () => {
      INSTRUMENTS.forEach((i) => {
        expect(i).toHaveProperty('id');
        expect(i).toHaveProperty('label');
        expect(i).toHaveProperty('digits');
        expect(typeof i.id).toBe('string');
        expect(typeof i.label).toBe('string');
        expect(typeof i.digits).toBe('number');
      });
    });
  });

  describe('getInstrument', () => {
    it('returns instrument by id', () => {
      const inst = getInstrument('EURUSD_OTC');
      expect(inst).toBeDefined();
      expect(inst?.id).toBe('EURUSD_OTC');
      expect(inst?.label).toContain('EUR');
    });

    it('returns undefined for unknown id', () => {
      expect(getInstrument('UNKNOWN')).toBeUndefined();
    });

    it('returns real market instrument', () => {
      const inst = getInstrument('EURUSD_REAL');
      expect(inst).toBeDefined();
      expect(inst?.id).toBe('EURUSD_REAL');
    });
  });

  describe('getInstrumentOrDefault', () => {
    it('returns instrument when id exists', () => {
      const inst = getInstrumentOrDefault('GBPUSD_OTC');
      expect(inst.id).toBe('GBPUSD_OTC');
    });

    it('returns default when id is undefined', () => {
      const inst = getInstrumentOrDefault(undefined);
      expect(inst.id).toBe(DEFAULT_INSTRUMENT_ID);
    });

    it('returns first instrument when id is unknown', () => {
      const inst = getInstrumentOrDefault('UNKNOWN_ID');
      expect(inst).toBeDefined();
      expect(INSTRUMENTS).toContainEqual(inst);
    });
  });
});
