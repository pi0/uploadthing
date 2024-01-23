import { createH3EventHandler } from "uploadthing/h3";

import { uploadRouter } from "../../src/router";

export default createH3EventHandler({
  router: uploadRouter,
});
