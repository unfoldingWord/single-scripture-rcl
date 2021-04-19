export function parseResourceManifest(resource){
  if (resource?.manifest?.dublin_core){
    const {
      manifest: {
        dublin_core: {
          title,
          version,
          rights,
          subject,
        },
      },
    } = resource
    return {
      title, version, rights, subject,
    }
  } else {
    return {}
  }
}

export default parseResourceManifest
