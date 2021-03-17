import * as assert from "assert";
import * as uri from "./main";

describe("Uri", () => {
  it("CreateFileUri", async () => {
    assert.strictEqual(uri.CreateFileUri("C:\\windows\\path\\file.txt"), "file:///C:/windows/path/file.txt");
    assert.strictEqual(uri.CreateFileUri("/linux/path/file.txt"), "file:///linux/path/file.txt");
    assert.throws(() => uri.CreateFileUri("relpath\\file.txt"));
    assert.throws(() => uri.CreateFileUri("relpath/file.txt"));
  });

  it("CreateFolderUri", async () => {
    assert.strictEqual(uri.CreateFolderUri("C:\\windows\\path\\"), "file:///C:/windows/path/");
    assert.strictEqual(uri.CreateFolderUri("/linux/path/"), "file:///linux/path/");
    assert.throws(() => uri.CreateFolderUri("relpath\\"));
    assert.throws(() => uri.CreateFolderUri("relpath/"));
    assert.throws(() => uri.CreateFolderUri("relpath"));
    assert.throws(() => uri.CreateFolderUri("relpath"));
  });

  it("EnumerateFiles local", async () => {
    let foundMyself = false;
    for (const file of await uri.EnumerateFiles(uri.CreateFolderUri(__dirname))) {
      if (file === uri.CreateFileUri(__filename)) {
        foundMyself = true;
      }
    }
    assert.strictEqual(foundMyself, true);
  });

  it("EnumerateFiles remote", async () => {
    let foundSomething = false;
    for (const file of await uri.EnumerateFiles(
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/",
      ["README.md"],
    )) {
      foundSomething = true;
    }
    assert.strictEqual(foundSomething, true);
  });

  it("ExistsUri", async () => {
    assert.strictEqual(
      await uri.ExistsUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/README.md"),
      true,
    );
    assert.strictEqual(
      await uri.ExistsUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/READMEx.md"),
      false,
    );
    assert.strictEqual(await uri.ExistsUri(uri.CreateFileUri(__filename)), true);
    assert.strictEqual(await uri.ExistsUri(uri.CreateFileUri(__filename + "_")), false);
  });

  it("ParentFolderUri", async () => {
    assert.strictEqual(
      uri.ParentFolderUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/README.md"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/",
    );
    assert.strictEqual(
      uri.ParentFolderUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/",
    );
    assert.strictEqual(
      uri.ParentFolderUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/"),
      "https://raw.githubusercontent.com/Azure/",
    );
    assert.strictEqual(
      uri.ParentFolderUri("https://raw.githubusercontent.com/Azure/"),
      "https://raw.githubusercontent.com/",
    );
    assert.strictEqual(uri.ParentFolderUri("https://raw.githubusercontent.com/"), "https://");
    assert.strictEqual(uri.ParentFolderUri("https://"), null);
  });

  it("ReadUri", async () => {
    assert.ok(
      (await uri.ReadUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/README.md")).length > 0,
    );
    assert.ok((await uri.ReadUri(uri.CreateFileUri(__filename))).length > 0);
  });

  it("ResolveUri", async () => {
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/", "README.md"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/README.md",
    );
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/", "../README.md"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/README.md",
    );
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master", "README.md"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/README.md",
    );
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master", "file:///README.md"),
      "file:///README.md",
    );
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master", "/README.md"),
      "file:///README.md",
    );
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master", "C:\\README.md"),
      "file:///C:/README.md",
    );
    // multi-slash collapsing
    assert.strictEqual(
      uri.ResolveUri("https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/", "folder///file.md"),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/folder/file.md",
    );
    // token forwarding
    assert.strictEqual(
      uri.ResolveUri(
        "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/file1.json?token=asd%3Dnot_really_a_token123%3D",
        "./file2.json",
      ),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/file2.json?token=asd%3Dnot_really_a_token123%3D",
    );
    assert.strictEqual(
      uri.ResolveUri(
        "https://myprivatepage.com/file1.json?token=asd%3Dnot_really_a_token123%3D",
        "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/file2.json",
      ),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/file2.json",
    );
    assert.strictEqual(
      uri.ResolveUri(
        "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/file1.json?token=asd%3Dnot_really_a_token123%3D",
        "https://evil.com/file2.json",
      ),
      "https://evil.com/file2.json",
    );
    assert.strictEqual(
      uri.ResolveUri("https://somewhere.com/file1.json?token=asd%3Dnot_really_a_token123%3D", "./file2.json"),
      "https://somewhere.com/file2.json",
    );
  });

  it("ToRawDataUrl", async () => {
    // GitHub blob
    assert.strictEqual(
      uri.ToRawDataUrl("https://github.com/Microsoft/vscode/blob/master/.gitignore"),
      "https://raw.githubusercontent.com/Microsoft/vscode/master/.gitignore",
    );
    assert.strictEqual(
      uri.ToRawDataUrl("https://github.com/Microsoft/TypeScript/blob/master/README.md"),
      "https://raw.githubusercontent.com/Microsoft/TypeScript/master/README.md",
    );
    assert.strictEqual(
      uri.ToRawDataUrl("https://github.com/Microsoft/TypeScript/blob/master/tests/cases/compiler/APISample_watcher.ts"),
      "https://raw.githubusercontent.com/Microsoft/TypeScript/master/tests/cases/compiler/APISample_watcher.ts",
    );
    assert.strictEqual(
      uri.ToRawDataUrl(
        "https://github.com/Azure/azure-rest-api-specs/blob/master/arm-web/2015-08-01/AppServiceCertificateOrders.json",
      ),
      "https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/arm-web/2015-08-01/AppServiceCertificateOrders.json",
    );

    // unknown / already raw
    assert.strictEqual(
      uri.ToRawDataUrl(
        "https://raw.githubusercontent.com/Microsoft/TypeScript/master/tests/cases/compiler/APISample_watcher.ts",
      ),
      "https://raw.githubusercontent.com/Microsoft/TypeScript/master/tests/cases/compiler/APISample_watcher.ts",
    );
    assert.strictEqual(
      uri.ToRawDataUrl(
        "https://assets.onestore.ms/cdnfiles/external/uhf/long/9a49a7e9d8e881327e81b9eb43dabc01de70a9bb/images/microsoft-gray.png",
      ),
      "https://assets.onestore.ms/cdnfiles/external/uhf/long/9a49a7e9d8e881327e81b9eb43dabc01de70a9bb/images/microsoft-gray.png",
    );
    assert.strictEqual(uri.ToRawDataUrl("README.md"), "README.md");
    assert.strictEqual(uri.ToRawDataUrl("compiler/APISample_watcher.ts"), "compiler/APISample_watcher.ts");
    assert.strictEqual(uri.ToRawDataUrl("compiler\\APISample_watcher.ts"), "compiler/APISample_watcher.ts");
    assert.strictEqual(
      uri.ToRawDataUrl("C:\\arm-web\\2015-08-01\\AppServiceCertificateOrders.json"),
      "c:/arm-web/2015-08-01/AppServiceCertificateOrders.json",
    );
  });

  fdescribe("simplifyUri", () => {
    it("simplify an uri with ..", () => {
      expect(uri.simplifyUri("https://github.com/foo/bar/some/path/../../readme.md")).toEqual(
        "https://github.com/foo/bar/readme.md",
      );
    });

    it("simplify an uri duplicate forward slash", () => {
      expect(uri.simplifyUri("https://github.com/foo/bar//some/path/../../readme.md")).toEqual(
        "https://github.com/foo/bar//readme.md",
      );
    });
  });
});
