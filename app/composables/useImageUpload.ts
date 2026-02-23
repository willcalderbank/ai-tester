import { ref as storageRef, uploadBytes, getDownloadURL, type FirebaseStorage } from 'firebase/storage'

export function useImageUpload() {
  const { $storage } = useNuxtApp() as { $storage: FirebaseStorage }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `images/${crypto.randomUUID()}.${ext}`
    const ref = storageRef($storage, path)
    await uploadBytes(ref, file)
    return getDownloadURL(ref)
  }

  return { uploadImage }
}
