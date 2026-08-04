// Webpack entry point.
//
// The stylesheet import lives here rather than in RubricEditor.ts so it stays
// out of the generated declarations: a `.d.ts` carrying `import './RubricEditor.css'`
// resolves to dist/types/RubricEditor.css for consumers, which does not exist.
// MiniCssExtractPlugin pulls the CSS out into its own file, so this import
// contributes nothing to the JavaScript bundle.
import './RubricEditor.css';

export { RubricEditor } from './RubricEditor';
