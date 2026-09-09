"""Seed de donnees de demonstration MboaFind (cote client).

Conforme a la strategie de lancement du cahier des charges : pilote a Yaounde
sur la verticale « informatique et electronique » (SSD, RAM, batteries,
chargeurs, telephones, depannage...).

Usage :
    python -m app.services.seed

Le script est idempotent : il ne cree les donnees de demo qu'une seule fois
(ignore les emails du domaine @demo.mboafind).
"""

from app.core.security import hash_password
from app.database.database import init_db
from app.database.session import SessionLocal
from app.models import (
    Category,
    Price,
    Product,
    Professional,
    Review,
    Service,
    ServiceRequest,
    Store,
    User,
)
from app.models.enums import (
    CategoryType,
    ReviewModerationStatus,
    ServiceRequestStatus,
    UserRole,
)
from app.utils.slug import slugify

DEMO_DOMAIN = "demo.mboafind"
DEMO_PASSWORD = "demo123456"

CATEGORIES = [
    ("Téléphones & Tablettes", "Telephones & Tablettes", CategoryType.PRODUCT,
     "Smartphones, tablettes et accessoires mobiles."),
    ("Ordinateurs & Laptops", "Ordinateurs & Laptops", CategoryType.PRODUCT,
     "PC portables, desktops et moniteurs."),
    ("Stockage & Mémoire", "Stockage & Memoire", CategoryType.PRODUCT,
     "SSD, disques durs, RAM et cartes memoire."),
    ("Accessoires", "Accessoires", CategoryType.PRODUCT,
     "Chargeurs, cables, batteries et peripheriques."),
    ("Réparation", "Reparation", CategoryType.SERVICE,
     "Reparation de telephones, ordinateurs et electronique."),
    ("Réseau & Informatique", "Reseau & Informatique", CategoryType.SERVICE,
     "Installation reseau, depannage et formation informatique."),
]

STORES = [
    ("TopTech Store Bastos", "Boris Etoa", "toptech@demo.mboafind", "+237 6 77 11 22 33",
     "Avenue Bastos, près de la boulangerie", "Yaoundé", 3.8910, 11.5160,
     "Boutique d'électronique de référence à Bastos.", True,
     "Lun-Ven 9h-18h, Sam 9h-16h"),
    ("Mboatech Nlongkak", "Sandra Tchatchou", "mboatech@demo.mboafind", "+237 6 55 44 33 22",
     "Rue 1.812 Nlongkak", "Yaoundé", 3.8780, 11.5310,
     "Spécialiste ordinateurs, composants et réseau.", False,
     "Lun-Sam 9h-18h30"),
    ("ElectroMarket Mokolo", "Thomas Ndongo", "electromarket@demo.mboafind", "+237 6 99 88 77 66",
     "Marché Mokolo, allée des téléphones", "Yaoundé", 3.8580, 11.4980,
     "Grossiste en téléphonie et accessoires.", True,
     "Lun-Dim 8h-19h"),
    ("Newline Computers Obili", "Merline Fotso", "newline@demo.mboafind", "+237 6 33 22 11 00",
     "Rue de l'Université, Obili", "Yaoundé", 3.8620, 11.5120,
     "Vente et réparation de matériel informatique.", False,
     "Lun-Ven 9h-18h, Sam 9h-13h"),
    ("Phone Fix & Co Mfoundi", "Abdoulaye Souleymanou", "phonefix@demo.mboafind", "+237 6 70 12 34 56",
     "Quartier Mfoundi, rue commerçante", "Yaoundé", 3.8720, 11.5140,
     "Atelier de réparation mobile et accessoires.", False,
     "Lun-Sam 8h30-18h"),
]
PRODUCTS = [
    ("SSD 512 Go SATA", "Samsung", "Stockage & Mémoire",
     "SSD SATA III 512 Go, lecture 560 Mo/s. Idéal pour accélérer un PC.",
     [(0, 38000, True), (1, 39500, True), (2, 37000, True)]),
    ("Téléphone Samsung Galaxy A15 128 Go", "Samsung", "Téléphones & Tablettes",
     "Smartphone 6,5\" 128 Go, double SIM, garantie 12 mois.",
     [(0, 135000, True), (2, 132500, True), (3, 138000, False)]),
    ("Chargeur USB-C 65W PD", "Anker", "Accessoires",
     "Chargeur rapide 65 W compatible téléphones et ordinateurs.",
     [(0, 8500, True), (4, 7500, True), (2, 8000, False)]),
    ("Batterie Dell Latitude 5590", "Dell", "Accessoires",
     "Batterie compatible Dell Latitude 5590, 56 Wh.",
     [(4, 22000, False), (3, 21500, True), (1, 23000, True)]),
    ("RAM 8 Go DDR4 3200 MHz", "Kingston", "Stockage & Mémoire",
     "Barrette mémoire DDR4 8 Go 3200 MHz, garantie à vie.",
     [(3, 16500, True), (1, 15900, True), (0, 17000, False)]),
    ("Écran PC 24 pouces Full HD", "HP", "Ordinateurs & Laptops",
     "Moniteur 24\" 1920x1080, HDMI + VGA, angle de vision large.",
     [(3, 68000, True), (1, 72000, True)]),
    ("Câble HDMI 2 m", "Belkin", "Accessoires",
     "Câble HDMI haute vitesse 2 m, compatible 4K.",
     [(4, 2500, True), (2, 3000, True)]),
    ("Ordinateur portable HP 15 8 Go 256 Go", "HP", "Ordinateurs & Laptops",
     "PC portable 15,6\" Ryzen 5, 8 Go RAM, SSD 256 Go, Windows 11.",
     [(1, 385000, True), (3, 390000, False)]),
]

PROFESSIONALS = [
    ("Jean-Pierre Nkoulou", "Réparateur de téléphones",
     "10 ans d'expérience en réparation de smartphones (écrans, batteries, connectique).",
     "Yaoundé", 3.8720, 11.5140, True,
     [("Réparation d'écran de téléphone", "Remplacement d'écran tactile ou LCD, 30 min.", 15000),
      ("Remplacement de batterie", "Diagnostic gratuit puis remplacement de batterie.", 10000),
      ("Diagnostic smartphone", "Contrôle complet du téléphone devant vous.", 0)]),
    ("Clarisse Abena", "Informaticienne / Dépannage PC",
     "Maintenance informatique à domicile ou en atelier : PC, réseau, données.",
     "Yaoundé", 3.8910, 11.5160, True,
     [("Dépannage ordinateur", "Virus, lenteurs, écran bleu : remise en état complète.", 20000),
      ("Installation réseau WiFi", "Borne WiFi, câblage et configuration dans toute la maison.", 35000),
      ("Récupération de données", "Récupération de fichiers depuis disques endommagés.", 40000)]),
    ("Patrick Omgba", "Électricien",
     "Électricité bâtiment : installations, réparations et mises aux normes.",
     "Yaoundé", 3.8780, 11.5310, False,
     [("Diagnostic panne électrique", "Déplacement et diagnostic sans engagement.", 5000),
      ("Réparation prise / câblage", "Remplacement de prises, interrupteurs et câbles.", 10000),
      ("Installation électrique complète", "Câblage complet d'un appartement ou d'un bureau.", 150000)]),
]

REVIEWS_STORES = [
    (0, 4, "Très bon accueil et prix corrects, je recommande pour l'électronique."),
    (2, 5, "Meilleur prix trouvé pour le téléphone. Attention à vérifier la dispo."),
]
def _user_or_create(db, *, email, full_name, phone, role, password):
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            phone=phone,
            role=role,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.flush()
    return user


def seed() -> None:
    """Cree les donnees de demonstration (une seule fois)."""
    init_db()
    db = SessionLocal()
    try:
        demo_client = (
            db.query(User).filter(User.email == f"client@{DEMO_DOMAIN}").first()
        )
        if demo_client is not None:
            print("Seed deja execute : rien a faire. (supprimez la base pour re-generer)")
            return

        client = _user_or_create(
            db, email=f"client@{DEMO_DOMAIN}", full_name="Achille Mbarga",
            phone="+237 6 55 00 00 01", role=UserRole.CLIENT, password=DEMO_PASSWORD,
        )

        # -- Categories ------------------------------------------------
        categories = {}
        for name, slug_label, cat_type, description in CATEGORIES:
            cat = Category(
                name=name, slug=slugify(slug_label), type=cat_type,
                description=description,
            )
            db.add(cat)
            categories[name] = cat
        db.flush()

        # -- Boutiques + produits + prix -------------------------------
        stores = []
        for (name, owner_full_name, email, phone, address, city, lat, lng,
             desc, verified, opening_hours) in STORES:
            owner = _user_or_create(
                db, email=email, full_name=owner_full_name, phone=phone,
                role=UserRole.COMMERCANT, password=DEMO_PASSWORD,
            )
            store = Store(
                owner_id=owner.id, name=name, description=desc, phone=phone,
                email=email, address=address, city=city, latitude=lat,
                longitude=lng, opening_hours=opening_hours, is_verified=verified,
            )
            db.add(store)
            stores.append(store)
        db.flush()
        store_ids = [s.id for s in stores]

        for name, brand, cat_name, description, offers in PRODUCTS:
            product = Product(
                name=name, slug=slugify(name), brand=brand,
                category_id=categories[cat_name].id, description=description,
            )
            db.add(product)
            db.flush()
            for store_idx, amount, available in offers:
                db.add(
                    Price(
                        product_id=product.id,
                        store_id=store_ids[store_idx],
                        amount=amount,
                        is_available=available,
                    )
                )
# -- Professionnels + services ---------------------------------
        professionals = []
        for (full_name, profession, bio, city, lat, lng, verified, services) in PROFESSIONALS:
            pro_user = _user_or_create(
                db, email=slugify(f"{full_name} pro") + "@demo.mboafind",
                full_name=full_name, phone="+237 6 90 00 00 00",
                role=UserRole.PROFESSIONNEL, password=DEMO_PASSWORD,
            )
            professional = Professional(
                user_id=pro_user.id, profession=profession, bio=bio, city=city,
                latitude=lat, longitude=lng, is_verified=verified,
            )
            db.add(professional)
            db.flush()
            professionals.append(professional)
            for service_name, service_desc, price in services:
                db.add(
                    Service(
                        professional_id=professional.id, name=service_name,
                        description=service_desc, price=price,
                    )
                )

        # -- Avis commercants + interaction de demo ---------------------
        for store_idx, rating, comment in REVIEWS_STORES:
            db.add(
                Review(
                    author_id=client.id, store_id=store_ids[store_idx],
                    rating=rating, comment=comment,
                    moderation_status=ReviewModerationStatus.APPROVED,
                )
            )

        pro = professionals[0]
        service = pro.services[0]
        db.add(
            ServiceRequest(
                client_id=client.id, service_id=service.id,
                message="Bonjour, je peux passer demain matin ?",
                status=ServiceRequestStatus.COMPLETED,
            )
        )
        db.add(
            Review(
                author_id=client.id, professional_id=pro.id, rating=5,
                comment="Intervention rapide et soignée, téléphone comme neuf !",
                moderation_status=ReviewModerationStatus.APPROVED,
            )
        )

        db.commit()
        nb_products = db.query(Product).count()
        nb_offers = db.query(Price).count()
        nb_services = db.query(Service).count()
        print("Seed de demonstration cree avec succes :")
        print(f"  - {len(stores)} boutiques, {nb_products} produits, {nb_offers} offres de prix")
        print(f"  - {len(professionals)} professionnels, {nb_services} services")
        print(f"  - mot de passe commun des comptes demo : {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()