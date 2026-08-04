import { describe, expect, it } from 'vitest';
import { criterionFields, levelFields, standardIdsField, standardTooltipId } from '../../src/dom/fieldNames';

/**
 * These names are a wire contract with the host's form handler. The literals
 * are spelled out rather than derived so that changing the scheme has to break
 * a test on purpose.
 */
describe('field names', () => {
    it('names criterion fields as positional arrays', () => {
        expect(criterionFields('criteria')).to.deep.equal({
            hash: 'criteria_hash[]',
            name: 'criteria_name[]',
            description: 'criteria_description[]'
        });
    });

    it('embeds the criterion index in level field names', () => {
        expect(levelFields('criteria', 2)).to.deep.equal({
            hash: 'criteria_2_level_hash[]',
            points: 'criteria_2_level_points[]',
            description: 'criteria_2_level_description[]'
        });
    });

    it('embeds the criterion index in the standard id field', () => {
        expect(standardIdsField('criteria', 3)).to.equal('criteria_3_standard_ids');
    });

    it('builds a tooltip id unique to the criterion and standard', () => {
        expect(standardTooltipId('criteria', 1, 42)).to.equal('criteria-1-standard-42-tooltip');
    });

    it('honours a custom prefix', () => {
        expect(criterionFields('rubric').name).to.equal('rubric_name[]');
        expect(levelFields('rubric', 0).points).to.equal('rubric_0_level_points[]');
    });
});
