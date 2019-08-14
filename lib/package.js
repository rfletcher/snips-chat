import fs   from "fs";
import path from "path";
import url  from "url";

var package_config;

function readPackageConfig() {
  if (!package_config) {
    const package_dir_path  = path.resolve(path.join(path.dirname(url.fileURLToPath(import.meta.url)), ".."));
    const package_json_path = path.join(package_dir_path, "package.json");

    package_config = JSON.parse(fs.readFileSync(package_json_path));
  }

  return package_config;
}

export default {
  get name() {
    return readPackageConfig().name;
  },

  get version() {
    return readPackageConfig().version
  }
}
