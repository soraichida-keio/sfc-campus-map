// esbuild で束ねて node から実行する入口(JSON import を解決するため)
import { allLines } from '../../src/js/lines_all.js';
import { ttsRead, lineKey, VOICE_TAG } from '../../src/js/reading.js';
export { allLines, ttsRead, lineKey, VOICE_TAG };
