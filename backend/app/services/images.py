"""Service de stockage des images de produits.

Une seule abstraction (`save_image_upload`) isole le stockage physique du
reste de l'application : aujourd'hui un dossier local, demain un bucket
cloud (S3, Cloudinary...) sans changer les schemas ni les routes.

Securite :
- seule la valeur MIME declaree est acceptee (etendue a une liste bloquee) ;
- la taille du fichier est bornee avant ecriture ;
- le fichier est renomme avec un identifiant aleatoire (aucun nom client
  conserve tel quel, pas de path traversal) ;
- le dossier de destination est dedie par produit.
"""

import os
import shutil
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def uploads_root() -> str:
    """Chemin absolu du dossier racine des uploads (cree si besoin)."""
    root = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(root, exist_ok=True)
    return root


def product_upload_dir(product_id: int) -> str:
    """Dossier dedie aux images d'un produit (cree si besoin)."""
    directory = os.path.join(uploads_root(), "products", str(product_id))
    os.makedirs(directory, exist_ok=True)
    return directory


def _validate_upload(upload: UploadFile) -> None:
    """Valide le type MIME et la taille limite d'une image.

    La limite de taille est appliquee en lisant le contenu, car la taille
    declaree par le client n'est pas fiable.
    """
    mime = (upload.content_type or "").lower()
    if mime not in settings.UPLOAD_ALLOWED_TYPES or mime not in _EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Type de fichier non autorise (JPEG, PNG, WEBP, GIF attendus)",
        )
    upload.file.seek(0, os.SEEK_END)
    size = upload.file.tell()
    upload.file.seek(0)
    max_bytes = max(1, settings.UPLOAD_MAX_SIZE_MB) * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image trop volumineuse (max {settings.UPLOAD_MAX_SIZE_MB} Mo)",
        )


def public_url(relative_path: str) -> str:
    """URL publique accessible depuis le frontend."""
    return f"/uploads/{relative_path.replace(os.sep, '/')}"


def save_image_upload(upload: UploadFile, product_id: int) -> str:
    """Valide et ecrit le fichier sur disque, retourne l'URL publique.

    Le nom de fichier final ne contient aucune donnee fournie par le client :
    un identifiant aleatoire est genere cote serveur.
    """
    _validate_upload(upload)
    extension = _EXTENSIONS[upload.content_type]
    filename = f"{uuid.uuid4().hex}{extension}"
    directory = product_upload_dir(product_id)
    destination = os.path.join(directory, filename)
    upload.file.seek(0)
    with open(destination, "wb") as out:
        shutil.copyfileobj(upload.file, out)
    return public_url(os.path.relpath(destination, uploads_root()))


def delete_image_file(public: str, product_id: int) -> None:
    """Supprime le fichier correspondant a une URL publique, si local.

    Best-effort : si le stockage evolue vers le cloud, cette fonction sera
    remplacee par l'appel du service externe correspondant. Le dossier du
    produit est nettoye quand vide afin d'eviter l'accumulation.
    """
    relative = public.removeprefix("/uploads/").replace("/", os.sep)
    directory = product_upload_dir(product_id)
    candidate = os.path.normpath(os.path.join(directory, relative))
    root = os.path.normpath(uploads_root())
    if not os.path.commonpath([candidate, root]).startswith(root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Chemin d'image invalide"
        )
    if os.path.isfile(candidate):
        try:
            os.remove(candidate)
        except OSError:
            pass
    try:
        os.rmdir(directory)
    except OSError:
        pass