const { resolve } = require("path");
const { URL } = require("url");
const AssetGraph = require("assetgraph");

const root = "https://politi.dk/";
const outRoot = resolve(__dirname, "..", "dist");

async function main() {
  const graph = new AssetGraph({
    root: root,
    canonicalRoot: root,
  });

  await graph.logEvents();

  const entryPage = "https://politi.dk/coronavirus-i-danmark";

  await graph.loadAssets(entryPage);

  await graph.populate({
    followRelations: {
      $or: [
        {
          crossorigin: false,
          type: "HtmlAnchor",
          href: (href) =>
            ["coronavirus-i-danmark", "coronavirus-in-denmark"].some((part) =>
              href.includes(part)
            ),
        },
        {
          type: { $nin: ["HtmlAnchor"] },
          to: {
            hostname: "politi.dk",
          },
        },
        {
          type: "HtmlAnchor",
          to: {
            hostname: "politi.dk",
            extension: { $in: [".pdf", ".png"] },
          },
        },
      ],
    },
  });

  await graph.mergeIdenticalAssets({ isLoaded: true, isInline: false });

  // graph.findAssets({ isLoaded: true, isInline: false }).map((a) => {
  //   a.url = a.url.replace(root, `file://${outRoot}/`);
  // });

  // await graph.moveAssets({ isInline: false, isLoaded: true }, (asset) => {
  //   const href = new URL(
  //     `${asset.path.replace(/^\//, "")}${asset.baseName || "index"}${
  //       asset.extension || asset.defaultExtension
  //     }`,
  //     `file://${outRoot}/`
  //   ).href;

  //   console.log(href);

  //   return href;
  // });

  graph
    .findAssets({ isLoaded: true, url: { $regex: /politi.dk:443/ } })
    .map((a) => {
      a.url = a.url.replace(":443", "");
    });

  graph.findRelations({ to: { isLoaded: true, isInline: false } }).map((r) => {
    r.canonical = false;
    r.hrefType = "rootRelative";
  });

  graph
    .findAssets({ isImage: true, isLoaded: true, extension: ".ashx" })
    .map((a) => {
      a.extension = `.${a.type.toLowerCase()}`;
    });

  graph
    .findAssets({ path: { $regex: /-\/media/ }, isLoaded: true })
    .map((a) => {
      a.path = a.path.replace(/.*?-\/media/, "/media");
    });

  graph
    .findAssets({
      type: "Html",
      isLoaded: true,
      isInline: false,
      extension: "",
    })
    .map((a) => {
      a.extension = ".html";

      if (
        ["coronavirus-i-danmark", "coronavirus-in-denmark"].includes(a.baseName)
      ) {
        a.baseName = "index";
      } else {
        a.url = a.url
          .replace("coronavirus-i-danmark/", "")
          .replace("coronavirus-in-denmark/", "");
      }
    });

  await graph.writeAssetsToDisc({ isLoaded: true }, outRoot, root);
}

main()
  .then(() => {
    console.log("DONE");
  })
  .catch((err) => {
    throw err;
  });
