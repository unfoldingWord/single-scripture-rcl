export function useResourceManifest(resource){
  if (resource && resource.manifest){
    const {
      manifest: {
        dublin_core: {
          title, version, rights,
        },
      },
    } = resource
    return {
      title, version, rights,
    }
  } else {
    return {}
  }
}

export default useResourceManifest
