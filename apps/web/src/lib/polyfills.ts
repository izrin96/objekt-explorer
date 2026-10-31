// client.tsx loads this only where Object.groupBy or Map.groupBy is missing (before Safari 17.4,
// Chrome 117); the other methods are older in every engine. Each import installs one global.
import "core-js/es/object/group-by";
import "core-js/es/map/group-by";
import "core-js/es/array/to-sorted";
import "core-js/es/array/to-reversed";
import "core-js/es/array/to-spliced";
import "core-js/es/array/find-last";
import "core-js/es/array/find-last-index";
