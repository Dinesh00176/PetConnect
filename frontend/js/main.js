// ============================================================
// PETCONNECT - MAIN JAVASCRIPT
// ============================================================

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://petconnect-0zjs.onrender.com";


// ============================================================
// IMAGE URL HELPER
// ============================================================
// Handles:
// 1. Cloudinary absolute URLs
// 2. Old /uploads/... local paths
// 3. Empty image values
// ============================================================

function petImageUrl(pet) {
  const fallback =
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80";

  if (!pet || !pet.image) {
    return fallback;
  }

  const image = String(pet.image).trim();

  if (!image) {
    return fallback;
  }

  // Cloudinary / any absolute HTTP(S) URL
  if (image.startsWith("https://") || image.startsWith("http://")) {
    return image;
  }

  // Protocol-relative URL
  if (image.startsWith("//")) {
    return window.location.protocol + image;
  }

  // Old local uploads such as /uploads/abc.jpg
  if (image.startsWith("/")) {
    return `${API_BASE_URL}${image}`;
  }

  // If database contains just a filename/path
  return `${API_BASE_URL}/${image}`;
}


// ============================================================
// SAFE HTML HELPER
// ============================================================

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// IMAGE ERROR HANDLER
// ============================================================
// If an image cannot load, replace it with fallback image.
// ============================================================

function imageErrorFallback(img) {
  if (!img) return;

  const fallback =
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80";

  if (img.dataset.fallbackApplied === "true") {
    return;
  }

  img.dataset.fallbackApplied = "true";
  img.src = fallback;
}


// ============================================================
// SPECIES BADGE
// ============================================================

function speciesBadgeClass(species) {
  return species === "Cat" ? "badge-cat" : "badge-dog";
}


// ============================================================
// GENDER ICON
// ============================================================

function genderIcon(gender) {
  return gender === "Female" ? "fa-venus" : "fa-mars";
}


// ============================================================
// GET CURRENT USER
// ============================================================

async function getCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    let data = {};

    try {
      data = await res.json();
    } catch {
      data = {};
    }

    // 401 simply means the visitor is not logged in.
    if (res.status === 401) {
      return {
        user: null,
        reachable: true,
      };
    }

    if (!res.ok) {
      return {
        user: null,
        reachable: true,
      };
    }

    return {
      user: data.success ? data.user : null,
      reachable: true,
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);

    return {
      user: null,
      reachable: false,
    };
  }
}


// ============================================================
// PET CARD
// ============================================================

function renderPetCard(pet, currentUserId) {
  const isOwner =
    currentUserId &&
    pet.addedBy &&
    String(pet.addedBy) === String(currentUserId);

  const ownerBtns = isOwner
    ? `
      <a
        class="edit-btn"
        href="editpet.html?id=${encodeURIComponent(pet._id)}"
        aria-label="Edit pet"
      >
        <i class="fa-solid fa-pen"></i>
      </a>

      <button
        class="delete-btn"
        data-pet-id="${escapeHtml(pet._id)}"
        data-pet-name="${escapeHtml(pet.name)}"
        aria-label="Delete pet"
        type="button"
      >
        <i class="fa-solid fa-trash"></i>
      </button>
    `
    : "";

  const statusClass =
    pet.status === "Pending"
      ? "pending"
      : pet.status === "Adopted"
      ? "adopted"
      : "";

  const statusBadge =
    pet.status && pet.status !== "Available"
      ? `<span class="status-pill ${statusClass}">${escapeHtml(
          pet.status
        )}</span>`
      : "";

  const imageUrl = petImageUrl(pet);

  return `
    <article class="pet-card">

      <div class="pet-img">

        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(pet.name)}"
          loading="lazy"
          onerror="imageErrorFallback(this)"
        />

        <span class="badge ${speciesBadgeClass(pet.species)}">
          ${escapeHtml(pet.species)}
        </span>

        <button
          class="fav-btn"
          aria-label="Add to favorites"
          type="button"
        >
          <i class="fa-regular fa-heart"></i>
        </button>

        <div class="owner-actions">
          ${ownerBtns}
        </div>

        ${statusBadge}

      </div>

      <div class="pet-info">

        <h3>${escapeHtml(pet.name)}</h3>

        <ul class="pet-meta">

          <li>
            <i class="fa-regular fa-calendar"></i>
            ${escapeHtml(pet.ageValue)}
            ${escapeHtml(pet.ageUnit)}
          </li>

          <li>
            <i class="fa-solid ${genderIcon(pet.gender)}"></i>
            ${escapeHtml(pet.gender)}
          </li>

          <li>
            <i class="fa-solid fa-location-dot"></i>
            ${escapeHtml(pet.location)}
          </li>

        </ul>

        <a
          href="pet-details.html?id=${encodeURIComponent(pet._id)}"
          class="btn btn-view"
        >
          View Profile
        </a>

      </div>

    </article>
  `;
}


// ============================================================
// DELETE PET
// ============================================================

async function deletePet(petId, petName, cardEl) {
  if (
    !confirm(
      `Remove ${petName} from PetConnect? This can't be undone.`
    )
  ) {
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/pets/${encodeURIComponent(petId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(
        data.message || "Failed to delete pet"
      );
    }

    if (cardEl) {
      cardEl.remove();
    }

  } catch (err) {
    console.error("Delete pet error:", err);
    alert(err.message);
  }
}


// ============================================================
// DELETE BUTTON HANDLERS
// ============================================================

function attachDeleteHandlers(container) {
  if (!container) return;

  container
    .querySelectorAll(".delete-btn")
    .forEach((btn) => {

      btn.addEventListener("click", (e) => {
        e.preventDefault();

        const petId = btn.getAttribute("data-pet-id");
        const petName =
          btn.getAttribute("data-pet-name") || "this pet";

        deletePet(
          petId,
          petName,
          btn.closest(".pet-card")
        );
      });

    });
}


// ============================================================
// STATE BOX
// ============================================================

function stateBox({ icon, title, text, retry }) {
  const retryBtn = retry
    ? `
      <button
        type="button"
        class="btn btn-outline"
        style="margin-top:16px;"
        onclick="window.location.reload()"
      >
        <i class="fa-solid fa-rotate-right"></i>
        Try Again
      </button>
    `
    : "";

  return `
    <div class="state-box">

      <i class="fa-solid ${icon}"></i>

      <h3>${escapeHtml(title)}</h3>

      <p>${escapeHtml(text)}</p>

      ${retryBtn}

    </div>
  `;
}


// ============================================================
// FAVORITES
// ============================================================

function attachFavHandlers(container) {
  if (!container) return;

  container
    .querySelectorAll(".fav-btn")
    .forEach((btn) => {

      btn.addEventListener("click", () => {

        btn.classList.toggle("active");

        const icon = btn.querySelector("i");

        if (!icon) return;

        if (btn.classList.contains("active")) {

          icon.classList.remove("fa-regular");
          icon.classList.add("fa-solid");

        } else {

          icon.classList.remove("fa-solid");
          icon.classList.add("fa-regular");

        }
      });

    });
}


// ============================================================
// HOME PAGE - FEATURED PETS
// ============================================================

const featuredGrid =
  document.getElementById("featuredGrid");

if (featuredGrid) {

  (async () => {

    try {

      const [authResult, res] = await Promise.all([
        getCurrentUser(),
        fetch(`${API_BASE_URL}/api/pets`, {
          headers: {
            Accept: "application/json",
          },
        }),
      ]);

      const { user } = authResult;

      const data = await res.json();

      if (!data.success || !data.pets || data.pets.length === 0) {

        featuredGrid.innerHTML = stateBox({
          icon: "fa-paw",
          title: "No pets listed yet",
          text: "Be the first to add a pet up for adoption!",
        });

        return;
      }

      const featured = data.pets.slice(0, 4);

      featuredGrid.innerHTML = featured
        .map((pet) =>
          renderPetCard(
            pet,
            user ? user.id : null
          )
        )
        .join("");

      attachFavHandlers(featuredGrid);
      attachDeleteHandlers(featuredGrid);

    } catch (err) {

      console.error("Featured pets error:", err);

      featuredGrid.innerHTML = stateBox({
        icon: "fa-triangle-exclamation",
        title: "Could not load pets",
        text:
          "Please try again in a moment.",
        retry: true,
      });

    }

  })();

}


// ============================================================
// BROWSE PAGE
// ============================================================

const petListGrid =
  document.getElementById("petListGrid");

if (petListGrid) {

  const searchInput =
    document.getElementById("searchInput");

  const speciesFilter =
    document.getElementById("speciesFilter");

  const genderFilter =
    document.getElementById("genderFilter");

  const locationFilter =
    document.getElementById("locationFilter");

  const sortFilter =
    document.getElementById("sortFilter");


  const loadPets = async () => {

    petListGrid.innerHTML = stateBox({
      icon: "fa-spinner fa-spin",
      title: "Loading pets...",
      text:
        "Fetching the latest pets from the database.",
    });


    const params = new URLSearchParams();


    if (
      searchInput &&
      searchInput.value.trim()
    ) {
      params.set(
        "search",
        searchInput.value.trim()
      );
    }


    if (
      speciesFilter &&
      speciesFilter.value
    ) {
      params.set(
        "species",
        speciesFilter.value
      );
    }


    if (
      genderFilter &&
      genderFilter.value
    ) {
      params.set(
        "gender",
        genderFilter.value
      );
    }


    if (
      locationFilter &&
      locationFilter.value.trim()
    ) {
      params.set(
        "location",
        locationFilter.value.trim()
      );
    }


    if (
      sortFilter &&
      sortFilter.value
    ) {
      params.set(
        "sort",
        sortFilter.value
      );
    }


    try {

      const [authResult, res] =
        await Promise.all([
          getCurrentUser(),

          fetch(
            `${API_BASE_URL}/api/pets?${params.toString()}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          ),
        ]);


      const { user } = authResult;

      const data = await res.json();


      if (
        !data.success ||
        !data.pets ||
        data.pets.length === 0
      ) {

        petListGrid.innerHTML = stateBox({
          icon: "fa-magnifying-glass",
          title: "No pets found",
          text:
            "Try adjusting your search or filters, or check back soon for new listings.",
        });

        return;
      }


      petListGrid.innerHTML = data.pets
        .map((pet) =>
          renderPetCard(
            pet,
            user ? user.id : null
          )
        )
        .join("");


      attachFavHandlers(petListGrid);
      attachDeleteHandlers(petListGrid);


    } catch (err) {

      console.error("Browse pets error:", err);

      petListGrid.innerHTML = stateBox({
        icon: "fa-triangle-exclamation",
        title: "Could not load pets",
        text:
          "Please try again in a moment.",
        retry: true,
      });

    }

  };


  loadPets();


  let searchDebounceTimer;


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      () => {

        clearTimeout(
          searchDebounceTimer
        );

        searchDebounceTimer =
          setTimeout(
            loadPets,
            350
          );

      }
    );

  }


  if (speciesFilter) {
    speciesFilter.addEventListener(
      "change",
      loadPets
    );
  }


  if (genderFilter) {
    genderFilter.addEventListener(
      "change",
      loadPets
    );
  }


  if (sortFilter) {
    sortFilter.addEventListener(
      "change",
      loadPets
    );
  }


  if (locationFilter) {

    locationFilter.addEventListener(
      "input",
      () => {

        clearTimeout(
          searchDebounceTimer
        );

        searchDebounceTimer =
          setTimeout(
            loadPets,
            350
          );

      }
    );

  }

}


// ============================================================
// PET DETAILS PAGE
// ============================================================

const petDetailsContainer =
  document.getElementById(
    "petDetailsContainer"
  );

if (petDetailsContainer) {

  const petId =
    new URLSearchParams(
      window.location.search
    ).get("id");


  (async () => {

    if (!petId) {

      petDetailsContainer.innerHTML =
        stateBox({
          icon: "fa-circle-exclamation",
          title: "No pet selected",
          text:
            "Head back to the browse page and choose a pet.",
        });

      return;
    }


    try {

      const [authResult, res] =
        await Promise.all([
          getCurrentUser(),

          fetch(
            `${API_BASE_URL}/api/pets/${encodeURIComponent(
              petId
            )}`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          ),
        ]);


      const { user } = authResult;

      const data = await res.json();


      if (!data.success) {

        petDetailsContainer.innerHTML =
          stateBox({
            icon: "fa-circle-exclamation",
            title: "Pet not found",
            text:
              "This pet may have been adopted already or removed from the listing.",
          });

        return;
      }


      const pet = data.pet;

      const isAvailable =
        pet.status === "Available";


      const isOwner =
        user &&
        pet.addedBy &&
        String(pet.addedBy) ===
          String(user.id);


      const actionMarkup =
        isAvailable
          ? `
            <button
              type="button"
              class="btn btn-primary"
              id="showAdoptFormBtn"
            >
              <i class="fa-solid fa-heart"></i>
              Adopt ${escapeHtml(pet.name)}
            </button>

            <form
              id="adoptForm"
              class="form-card"
              style="display:none; margin-top:24px; padding:28px;"
            >

              <input
                type="hidden"
                name="petId"
                value="${escapeHtml(pet._id)}"
              />

              <h3
                style="color:var(--dark); margin-bottom:18px; font-size:1.1rem;"
              >
                <i
                  class="fa-solid fa-paw"
                  style="color:var(--primary);"
                ></i>
                Tell us about you
              </h3>


              <div class="form-group full">
                <label for="adopterName">
                  Full Name *
                </label>

                <input
                  type="text"
                  id="adopterName"
                  name="adopterName"
                  placeholder="Your name"
                  required
                />
              </div>


              <div class="form-group full">
                <label for="adopterEmail">
                  Email *
                </label>

                <input
                  type="email"
                  id="adopterEmail"
                  name="adopterEmail"
                  placeholder="you@example.com"
                  required
                />
              </div>


              <div class="form-group full">
                <label for="adopterPhone">
                  Phone *
                </label>

                <input
                  type="text"
                  id="adopterPhone"
                  name="adopterPhone"
                  placeholder="Your contact number"
                  required
                />
              </div>


              <div class="form-group full">
                <label for="adopterAddress">
                  Address
                </label>

                <input
                  type="text"
                  id="adopterAddress"
                  name="adopterAddress"
                  placeholder="Where the pet will live"
                />
              </div>


              <div class="form-group full">
                <label for="adoptMessage">
                  Message
                </label>

                <textarea
                  id="adoptMessage"
                  name="message"
                  placeholder="Tell us why you'd be a great fit for ${escapeHtml(
                    pet.name
                  )}..."
                ></textarea>
              </div>


              <div class="form-submit-row">

                <button
                  type="submit"
                  class="btn btn-primary"
                  id="adoptSubmitBtn"
                >
                  <i class="fa-solid fa-check"></i>
                  Submit Adoption Request
                </button>

                <span
                  class="form-msg"
                  id="adoptMsg"
                ></span>

              </div>

            </form>
          `
          : `
            <span
              class="btn"
              style="
                background:var(--text-light);
                color:#fff;
                cursor:not-allowed;
              "
            >
              <i class="fa-solid fa-house-circle-check"></i>
              ${escapeHtml(pet.name)}
              Has Been Adopted
            </span>
          `;


      const ownerMarkup =
        isOwner
          ? `
            <a
              href="editpet.html?id=${encodeURIComponent(
                pet._id
              )}"
              class="btn btn-outline"
              style="margin-left:12px;"
            >
              <i class="fa-solid fa-pen"></i>
              Edit Listing
            </a>

            <button
              type="button"
              class="btn btn-outline"
              id="deletePetBtn"
              style="
                border-color:var(--danger);
                color:var(--danger);
                margin-left:12px;
              "
            >
              <i class="fa-solid fa-trash"></i>
              Delete Listing
            </button>
          `
          : "";


      petDetailsContainer.innerHTML = `

        <div class="pet-details-layout">

          <div class="pet-details-img">

            <img
              src="${escapeHtml(
                petImageUrl(pet)
              )}"
              alt="${escapeHtml(
                pet.name
              )}"
              onerror="imageErrorFallback(this)"
            />

          </div>


          <div class="pet-details-info">

            <span
              class="badge ${speciesBadgeClass(
                pet.species
              )}"
              style="
                position:static;
                display:inline-block;
                margin-bottom:12px;
              "
            >
              ${escapeHtml(
                pet.species
              )}
            </span>


            <h1
              style="
                font-size:2rem;
                color:var(--dark);
                margin-bottom:12px;
              "
            >
              ${escapeHtml(pet.name)}
            </h1>


            <ul
              class="pet-meta"
              style="
                font-size:0.9rem;
                margin-bottom:20px;
              "
            >

              <li>
                <i class="fa-solid fa-dog"></i>
                ${escapeHtml(pet.breed)}
              </li>

              <li>
                <i class="fa-regular fa-calendar"></i>
                ${escapeHtml(pet.ageValue)}
                ${escapeHtml(pet.ageUnit)}
              </li>

              <li>
                <i class="fa-solid ${genderIcon(
                  pet.gender
                )}"></i>
                ${escapeHtml(pet.gender)}
              </li>

              <li>
                <i class="fa-solid fa-location-dot"></i>
                ${escapeHtml(pet.location)}
              </li>

            </ul>


            <p
              style="
                color:var(--text-light);
                margin-bottom:28px;
                line-height:1.7;
              "
            >
              ${
                escapeHtml(
                  pet.description
                ) ||
                "No description provided yet."
              }
            </p>


            <div
              style="
                display:flex;
                align-items:center;
                flex-wrap:wrap;
              "
            >
              ${actionMarkup}
              ${ownerMarkup}
            </div>

          </div>

        </div>
      `;


      // ========================================================
      // DELETE FROM DETAILS
      // ========================================================

      if (isOwner) {

        const deletePetBtn =
          document.getElementById(
            "deletePetBtn"
          );

        if (deletePetBtn) {

          deletePetBtn.addEventListener(
            "click",
            async () => {

              if (
                !confirm(
                  `Remove ${pet.name} from PetConnect? This can't be undone.`
                )
              ) {
                return;
              }


              try {

                const delRes =
                  await fetch(
                    `${API_BASE_URL}/api/pets/${encodeURIComponent(
                      pet._id
                    )}`,
                    {
                      method: "DELETE",
                      credentials: "include",
                    }
                  );


                const delData =
                  await delRes.json();


                if (
                  !delRes.ok ||
                  !delData.success
                ) {
                  throw new Error(
                    delData.message ||
                      "Failed to delete pet"
                  );
                }


                window.location.href =
                  "browse.html";


              } catch (err) {

                alert(err.message);

              }

            }
          );

        }

      }


      // ========================================================
      // ADOPTION FORM
      // ========================================================

      if (isAvailable) {

        const showAdoptFormBtn =
          document.getElementById(
            "showAdoptFormBtn"
          );

        const adoptForm =
          document.getElementById(
            "adoptForm"
          );


        if (
          showAdoptFormBtn &&
          adoptForm
        ) {

          showAdoptFormBtn.addEventListener(
            "click",
            () => {

              const isHidden =
                adoptForm.style.display ===
                "none";


              adoptForm.style.display =
                isHidden
                  ? "block"
                  : "none";


              if (
                adoptForm.style.display ===
                "block"
              ) {

                adoptForm.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });


                if (user) {

                  const nameInput =
                    document.getElementById(
                      "adopterName"
                    );

                  const emailInput =
                    document.getElementById(
                      "adopterEmail"
                    );


                  if (nameInput) {
                    nameInput.value =
                      user.name || "";
                  }


                  if (emailInput) {
                    emailInput.value =
                      user.email || "";
                  }

                }

              }

            }
          );


          adoptForm.addEventListener(
            "submit",
            async (e) => {

              e.preventDefault();


              const adoptMsg =
                document.getElementById(
                  "adoptMsg"
                );

              const adoptSubmitBtn =
                document.getElementById(
                  "adoptSubmitBtn"
                );


              adoptMsg.textContent = "";
              adoptMsg.className =
                "form-msg";


              adoptSubmitBtn.disabled =
                true;

              adoptSubmitBtn.innerHTML =
                `
                  <i class="fa-solid fa-spinner fa-spin"></i>
                  Submitting...
                `;


              try {

                const formData =
                  new FormData(
                    adoptForm
                  );


                const payload =
                  Object.fromEntries(
                    formData.entries()
                  );


                const res =
                  await fetch(
                    `${API_BASE_URL}/api/adoptions`,
                    {
                      method: "POST",

                      headers: {
                        "Content-Type":
                          "application/json",
                      },

                      credentials:
                        "include",

                      body: JSON.stringify(
                        payload
                      ),
                    }
                  );


                const resData =
                  await res.json();


                if (
                  !res.ok ||
                  !resData.success
                ) {
                  throw new Error(
                    resData.message ||
                      "Something went wrong"
                  );
                }


                adoptMsg.textContent =
                  resData.message;

                adoptMsg.classList.add(
                  "success"
                );


                adoptForm.reset();


                setTimeout(() => {

                  window.location.href =
                    "browse.html";

                }, 1500);


              } catch (err) {

                adoptMsg.textContent =
                  err.message;

                adoptMsg.classList.add(
                  "error"
                );


              } finally {

                adoptSubmitBtn.disabled =
                  false;

                adoptSubmitBtn.innerHTML =
                  `
                    <i class="fa-solid fa-check"></i>
                    Submit Adoption Request
                  `;

              }

            }
          );

        }

      }

    } catch (err) {

      console.error(
        "Pet details error:",
        err
      );

      petDetailsContainer.innerHTML =
        stateBox({
          icon: "fa-triangle-exclamation",
          title: "Could not load pet",
          text:
            "Please try again in a moment.",
          retry: true,
        });

    }

  })();

}


// ============================================================
// ADD PET PAGE
// ============================================================

const addPetForm =
  document.getElementById(
    "addPetForm"
  );

const addPetLoginNotice =
  document.getElementById(
    "addPetLoginNotice"
  );


if (addPetForm) {

  (async () => {

    const {
      user,
      reachable,
    } = await getCurrentUser();


    // --------------------------------------------------------
    // NOT LOGGED IN
    // --------------------------------------------------------

    if (!user) {

      addPetForm.style.display =
        "none";


      if (addPetLoginNotice) {

        addPetLoginNotice.style.display =
          "block";


        if (!reachable) {

          const icon =
            addPetLoginNotice.querySelector(
              "i"
            );

          const heading =
            addPetLoginNotice.querySelector(
              "h3"
            );

          const paragraph =
            addPetLoginNotice.querySelector(
              "p"
            );

          const link =
            addPetLoginNotice.querySelector(
              "a"
            );


          if (icon) {
            icon.className =
              "fa-solid fa-triangle-exclamation";
          }


          if (heading) {
            heading.textContent =
              "Could not reach the server";
          }


          if (paragraph) {
            paragraph.textContent =
              "Please try again after the backend is awake.";
          }


          if (link) {
            link.style.display =
              "none";
          }

        }

      }

      return;
    }


    // --------------------------------------------------------
    // LOGGED IN
    // --------------------------------------------------------

    addPetForm.style.display =
      "";


    if (addPetLoginNotice) {
      addPetLoginNotice.style.display =
        "none";
    }


    const formMsg =
      document.getElementById(
        "formMsg"
      );

    const submitBtn =
      document.getElementById(
        "submitBtn"
      );

    const imageInput =
      document.getElementById(
        "image"
      );

    const filePreview =
      document.getElementById(
        "filePreview"
      );

    const filePreviewImg =
      document.getElementById(
        "filePreviewImg"
      );

    const fileDropText =
      document.getElementById(
        "fileDropText"
      );


    // --------------------------------------------------------
    // IMAGE PREVIEW
    // --------------------------------------------------------

    if (imageInput) {

      imageInput.addEventListener(
        "change",
        () => {

          const file =
            imageInput.files[0];


          if (!file) {
            return;
          }


          if (fileDropText) {
            fileDropText.textContent =
              file.name;
          }


          if (filePreviewImg) {

            const reader =
              new FileReader();


            reader.onload = (e) => {

              filePreviewImg.src =
                e.target.result;

              filePreview.style.display =
                "block";

            };


            reader.readAsDataURL(file);

          }

        }
      );

    }


    // --------------------------------------------------------
    // ADD PET SUBMIT
    // --------------------------------------------------------

    addPetForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        formMsg.textContent = "";
        formMsg.className =
          "form-msg";


        const formData =
          new FormData(
            addPetForm
          );


        submitBtn.disabled =
          true;


        submitBtn.innerHTML =
          `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Adding Pet...
          `;


        try {

          const res =
            await fetch(
              `${API_BASE_URL}/api/pets`,
              {
                method: "POST",

                credentials:
                  "include",

                body: formData,
              }
            );


          const data =
            await res.json();


          if (
            !res.ok ||
            !data.success
          ) {

            throw new Error(
              data.message ||
                "Something went wrong"
            );

          }


          formMsg.textContent =
            `${data.pet.name} was added successfully! Redirecting to browse page...`;

          formMsg.classList.add(
            "success"
          );


          addPetForm.reset();


          if (filePreview) {
            filePreview.style.display =
              "none";
          }


          if (fileDropText) {
            fileDropText.textContent =
              "Click to upload a photo (JPG, PNG, WEBP — max 5MB)";
          }


          setTimeout(() => {

            window.location.href =
              "browse.html";

          }, 1200);


        } catch (err) {

          console.error(
            "Add pet error:",
            err
          );


          formMsg.textContent =
            err.message ||
            "Failed to add pet.";

          formMsg.classList.add(
            "error"
          );


        } finally {

          submitBtn.disabled =
            false;


          submitBtn.innerHTML =
            `
              <i class="fa-solid fa-paw"></i>
              Add Pet
            `;

        }

      }
    );

  })();

}


// ============================================================
// EDIT PET PAGE
// ============================================================

const editPetForm =
  document.getElementById(
    "editPetForm"
  );

const editPetStateBox =
  document.getElementById(
    "editPetStateBox"
  );


if (editPetForm) {

  const petId =
    new URLSearchParams(
      window.location.search
    ).get("id");


  (async () => {

    if (!petId) {

      editPetForm.style.display =
        "none";


      if (editPetStateBox) {

        editPetStateBox.innerHTML =
          stateBox({
            icon:
              "fa-circle-exclamation",
            title:
              "No pet selected",
            text:
              "Head back to My Pets and choose a listing to edit.",
          });

      }

      return;
    }


    const {
      user,
    } = await getCurrentUser();


    if (!user) {

      editPetForm.style.display =
        "none";


      if (editPetStateBox) {

        editPetStateBox.innerHTML =
          stateBox({
            icon: "fa-lock",
            title:
              "Please log in",
            text:
              "You need to be logged in to edit a pet listing.",
          });

      }

      return;
    }


    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/pets/${encodeURIComponent(
            petId
          )}`,
          {
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const data =
        await res.json();


      if (
        !res.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
            "Pet not found"
        );

      }


      const pet =
        data.pet;


      const isOwner =
        pet.addedBy &&
        String(pet.addedBy) ===
          String(user.id);


      if (!isOwner) {

        editPetForm.style.display =
          "none";


        if (editPetStateBox) {

          editPetStateBox.innerHTML =
            stateBox({
              icon:
                "fa-lock",
              title:
                "Not your listing",
              text:
                "You can only edit pets that you added yourself.",
            });

        }

        return;
      }


      // ------------------------------------------------------
      // PREFILL FORM
      // ------------------------------------------------------

      const nameInput =
        editPetForm.querySelector(
          "#name"
        );

      const speciesInput =
        editPetForm.querySelector(
          "#species"
        );

      const breedInput =
        editPetForm.querySelector(
          "#breed"
        );

      const genderInput =
        editPetForm.querySelector(
          "#gender"
        );

      const ageValueInput =
        editPetForm.querySelector(
          "#ageValue"
        );

      const ageUnitInput =
        editPetForm.querySelector(
          "#ageUnit"
        );

      const locationInput =
        editPetForm.querySelector(
          "#location"
        );

      const descriptionInput =
        editPetForm.querySelector(
          "#description"
        );


      if (nameInput)
        nameInput.value =
          pet.name || "";

      if (speciesInput)
        speciesInput.value =
          pet.species || "";

      if (breedInput)
        breedInput.value =
          pet.breed || "";

      if (genderInput)
        genderInput.value =
          pet.gender || "";

      if (ageValueInput)
        ageValueInput.value =
          pet.ageValue ?? "";

      if (ageUnitInput)
        ageUnitInput.value =
          pet.ageUnit || "Months";

      if (locationInput)
        locationInput.value =
          pet.location || "";

      if (descriptionInput)
        descriptionInput.value =
          pet.description || "";


      // ------------------------------------------------------
      // CURRENT IMAGE
      // ------------------------------------------------------

      const filePreview =
        document.getElementById(
          "filePreview"
        );

      const filePreviewImg =
        document.getElementById(
          "filePreviewImg"
        );


      if (
        pet.image &&
        filePreview &&
        filePreviewImg
      ) {

        filePreviewImg.src =
          petImageUrl(pet);

        filePreviewImg.onerror =
          function () {
            imageErrorFallback(
              this
            );
          };

        filePreview.style.display =
          "block";

      }


      const formMsg =
        document.getElementById(
          "formMsg"
        );

      const submitBtn =
        document.getElementById(
          "submitBtn"
        );

      const imageInput =
        document.getElementById(
          "image"
        );

      const fileDropText =
        document.getElementById(
          "fileDropText"
        );


      // ------------------------------------------------------
      // NEW IMAGE PREVIEW
      // ------------------------------------------------------

      if (imageInput) {

        imageInput.addEventListener(
          "change",
          () => {

            const file =
              imageInput.files[0];


            if (!file) return;


            if (fileDropText) {

              fileDropText.textContent =
                file.name;

            }


            if (filePreviewImg) {

              const reader =
                new FileReader();


              reader.onload =
                (e) => {

                  filePreviewImg.src =
                    e.target.result;

                  filePreview.style.display =
                    "block";

                };


              reader.readAsDataURL(
                file
              );

            }

          }
        );

      }


      // ------------------------------------------------------
      // EDIT SUBMIT
      // ------------------------------------------------------

      editPetForm.addEventListener(
        "submit",
        async (e) => {

          e.preventDefault();


          formMsg.textContent =
            "";

          formMsg.className =
            "form-msg";


          const formData =
            new FormData(
              editPetForm
            );


          submitBtn.disabled =
            true;


          submitBtn.innerHTML =
            `
              <i class="fa-solid fa-spinner fa-spin"></i>
              Saving Changes...
            `;


          try {

            const putRes =
              await fetch(
                `${API_BASE_URL}/api/pets/${encodeURIComponent(
                  petId
                )}`,
                {
                  method: "PUT",

                  credentials:
                    "include",

                  body: formData,
                }
              );


            const putData =
              await putRes.json();


            if (
              !putRes.ok ||
              !putData.success
            ) {

              throw new Error(
                putData.message ||
                  "Something went wrong"
              );

            }


            formMsg.textContent =
              `${putData.pet.name} was updated successfully! Redirecting...`;

            formMsg.classList.add(
              "success"
            );


            setTimeout(() => {

              window.location.href =
                "mypets.html";

            }, 1200);


          } catch (err) {

            formMsg.textContent =
              err.message ||
              "Failed to update pet.";

            formMsg.classList.add(
              "error"
            );


          } finally {

            submitBtn.disabled =
              false;


            submitBtn.innerHTML =
              `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes
              `;

          }

        }
      );


    } catch (err) {

      console.error(
        "Edit pet error:",
        err
      );


      editPetForm.style.display =
        "none";


      if (editPetStateBox) {

        editPetStateBox.innerHTML =
          stateBox({
            icon:
              "fa-triangle-exclamation",
            title:
              "Could not load pet",
            text:
              "Please try again in a moment.",
            retry:
              true,
          });

      }

    }

  })();

}


// ============================================================
// MY PETS PAGE
// ============================================================

const myPetsGrid =
  document.getElementById(
    "myPetsGrid"
  );


if (myPetsGrid) {

  (async () => {

    const {
      user,
    } = await getCurrentUser();


    if (!user) {

      myPetsGrid.innerHTML =
        stateBox({
          icon: "fa-lock",
          title:
            "Please log in",
          text:
            "Log in to see the pets you have listed for adoption.",
        });

      return;
    }


    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/pets/mine`,
          {
            credentials:
              "include",

            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const data =
        await res.json();


      if (
        !res.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
            "Failed to load your pets"
        );

      }


      if (
        !data.pets ||
        data.pets.length === 0
      ) {

        myPetsGrid.innerHTML =
          stateBox({
            icon:
              "fa-paw",
            title:
              "You haven't listed any pets yet",
            text:
              "Add a pet to start finding it a loving home.",
          });

        return;
      }


      myPetsGrid.innerHTML =
        data.pets
          .map((pet) =>
            renderPetCard(
              pet,
              user.id
            )
          )
          .join("");


      attachFavHandlers(
        myPetsGrid
      );

      attachDeleteHandlers(
        myPetsGrid
      );


    } catch (err) {

      console.error(
        "My pets error:",
        err
      );


      myPetsGrid.innerHTML =
        stateBox({
          icon:
            "fa-triangle-exclamation",
          title:
            "Could not load your pets",
          text:
            "Please try again in a moment.",
          retry:
            true,
        });

    }

  })();

}


// ============================================================
// AUTH NAVIGATION
// ============================================================

const navAuthBtn =
  document.getElementById(
    "navAuthBtn"
  );

const myPetsLink =
  document.getElementById(
    "myPetsLink"
  );


async function refreshAuthNav() {

  const {
    user,
  } = await getCurrentUser();


  if (!user) {
    return;
  }


  if (myPetsLink) {

    myPetsLink.style.display =
      "";

  }


  if (!navAuthBtn) {
    return;
  }


  const firstName =
    user.name
      ? user.name.split(" ")[0]
      : "User";


  navAuthBtn.textContent =
    "";


  navAuthBtn.removeAttribute(
    "href"
  );


  navAuthBtn.style.cursor =
    "pointer";


  navAuthBtn.innerHTML =
    `
      <i class="fa-solid fa-right-from-bracket"></i>
      Log Out (${escapeHtml(
        firstName
      )})
    `;


  navAuthBtn.onclick =
    async (e) => {

      e.preventDefault();


      try {

        await fetch(
          `${API_BASE_URL}/api/auth/logout`,
          {
            method: "POST",
            credentials:
              "include",
          }
        );

      } catch (err) {

        console.error(
          "Logout error:",
          err
        );

      }


      window.location.href =
        "index.html";

    };

}


refreshAuthNav();


// ============================================================
// LOGIN / SIGNUP PAGE
// ============================================================

const loginForm =
  document.getElementById(
    "loginForm"
  );


if (loginForm) {

  const signupForm =
    document.getElementById(
      "signupForm"
    );

  const loginTabBtn =
    document.getElementById(
      "loginTabBtn"
    );

  const signupTabBtn =
    document.getElementById(
      "signupTabBtn"
    );

  const loginMsg =
    document.getElementById(
      "loginMsg"
    );

  const signupMsg =
    document.getElementById(
      "signupMsg"
    );

  const loginSubmitBtn =
    document.getElementById(
      "loginSubmitBtn"
    );

  const signupSubmitBtn =
    document.getElementById(
      "signupSubmitBtn"
    );


  // ----------------------------------------------------------
  // LOGIN TAB
  // ----------------------------------------------------------

  if (
    loginTabBtn &&
    signupTabBtn &&
    signupForm
  ) {

    loginTabBtn.addEventListener(
      "click",
      () => {

        loginTabBtn.classList.add(
          "active"
        );

        signupTabBtn.classList.remove(
          "active"
        );

        loginForm.style.display =
          "block";

        signupForm.style.display =
          "none";

      }
    );


    signupTabBtn.addEventListener(
      "click",
      () => {

        signupTabBtn.classList.add(
          "active"
        );

        loginTabBtn.classList.remove(
          "active"
        );

        signupForm.style.display =
          "block";

        loginForm.style.display =
          "none";

      }
    );

  }


  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------

  loginForm.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      loginMsg.textContent =
        "";

      loginMsg.className =
        "form-msg";


      loginSubmitBtn.disabled =
        true;


      loginSubmitBtn.innerHTML =
        `
          <i class="fa-solid fa-spinner fa-spin"></i>
          Logging in...
        `;


      try {

        const res =
          await fetch(
            `${API_BASE_URL}/api/auth/login`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Accept:
                  "application/json",
              },

              credentials:
                "include",

              body: JSON.stringify({
                email:
                  document.getElementById(
                    "loginEmail"
                  ).value.trim(),

                password:
                  document.getElementById(
                    "loginPassword"
                  ).value,
              }),
            }
          );


        const data =
          await res.json();


        if (
          !res.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Login failed"
          );

        }


        loginMsg.textContent =
          data.message;

        loginMsg.classList.add(
          "success"
        );


        setTimeout(() => {

          window.location.href =
            "index.html";

        }, 800);


      } catch (err) {

        console.error(
          "Login error:",
          err
        );


        loginMsg.textContent =
          err.message;

        loginMsg.classList.add(
          "error"
        );


      } finally {

        loginSubmitBtn.disabled =
          false;


        loginSubmitBtn.innerHTML =
          `
            <i class="fa-solid fa-right-to-bracket"></i>
            Log In
          `;

      }

    }
  );


  // ----------------------------------------------------------
  // SIGNUP
  // ----------------------------------------------------------

  const isValidEmail =
    (email) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      );


  if (signupForm) {

    signupForm.addEventListener(
      "submit",
      async (e) => {

        e.preventDefault();


        signupMsg.textContent =
          "";

        signupMsg.className =
          "form-msg";


        const name =
          document
            .getElementById(
              "signupName"
            )
            .value.trim();


        const email =
          document
            .getElementById(
              "signupEmail"
            )
            .value.trim();


        const password =
          document
            .getElementById(
              "signupPassword"
            )
            .value;


        const confirmPassword =
          document
            .getElementById(
              "signupConfirmPassword"
            )
            .value;


        if (!name) {

          signupMsg.textContent =
            "Please enter your name";

          signupMsg.classList.add(
            "error"
          );

          return;

        }


        if (!isValidEmail(email)) {

          signupMsg.textContent =
            "Please enter a valid email address";

          signupMsg.classList.add(
            "error"
          );

          return;

        }


        if (password.length < 6) {

          signupMsg.textContent =
            "Password must be at least 6 characters";

          signupMsg.classList.add(
            "error"
          );

          return;

        }


        if (
          password !==
          confirmPassword
        ) {

          signupMsg.textContent =
            "Passwords do not match";

          signupMsg.classList.add(
            "error"
          );

          return;

        }


        signupSubmitBtn.disabled =
          true;


        signupSubmitBtn.innerHTML =
          `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Creating account...
          `;


        try {

          const res =
            await fetch(
              `${API_BASE_URL}/api/auth/register`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                credentials:
                  "include",

                body: JSON.stringify({
                  name,
                  email,
                  password,
                }),
              }
            );


          const data =
            await res.json();


          if (
            !res.ok ||
            !data.success
          ) {

            throw new Error(
              data.message ||
                "Sign up failed"
            );

          }


          signupMsg.textContent =
            data.message;

          signupMsg.classList.add(
            "success"
          );


          setTimeout(() => {

            window.location.href =
              "index.html";

          }, 800);


        } catch (err) {

          console.error(
            "Signup error:",
            err
          );


          signupMsg.textContent =
            err.message;

          signupMsg.classList.add(
            "error"
          );


        } finally {

          signupSubmitBtn.disabled =
            false;


          signupSubmitBtn.innerHTML =
            `
              <i class="fa-solid fa-user-plus"></i>
              Create Account
            `;

        }

      }
    );

  }

}


// ============================================================
// ADOPTION RECORDS
// ============================================================

const adoptionsList =
  document.getElementById(
    "adoptionsList"
  );


if (adoptionsList) {

  (async () => {

    try {

      const res =
        await fetch(
          `${API_BASE_URL}/api/adoptions`,
          {
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const data =
        await res.json();


      if (
        !data.success ||
        !data.adoptions ||
        data.adoptions.length === 0
      ) {

        adoptionsList.innerHTML =
          stateBox({
            icon:
              "fa-clipboard-list",
            title:
              "No adoptions yet",
            text:
              "Once a pet is adopted, the record will show up here.",
          });

        return;
      }


      adoptionsList.innerHTML =
        data.adoptions
          .map((a) => {

            const petImg =
              a.petImage
                ? petImageUrl({
                    image:
                      a.petImage,
                  })
                : "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80";


            const date =
              new Date(
                a.createdAt
              ).toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              );


            return `
              <div class="adoption-row">

                <img
                  src="${escapeHtml(
                    petImg
                  )}"
                  alt="${escapeHtml(
                    a.petName
                  )}"
                  class="adoption-pet-img"
                  onerror="imageErrorFallback(this)"
                />

                <div class="adoption-details">

                  <h4>
                    ${escapeHtml(
                      a.petName
                    )}

                    ${
                      a.petBreed
                        ? `
                          <span
                            style="
                              font-weight:400;
                              color:var(--text-light);
                              font-size:0.85rem;
                            "
                          >
                            (${escapeHtml(
                              a.petBreed
                            )})
                          </span>
                        `
                        : ""
                    }

                  </h4>


                  <p>
                    <i class="fa-regular fa-user"></i>
                    ${escapeHtml(
                      a.adopterName
                    )}

                    &nbsp;·&nbsp;

                    <i class="fa-regular fa-envelope"></i>
                    ${escapeHtml(
                      a.adopterEmail
                    )}

                    &nbsp;·&nbsp;

                    <i class="fa-solid fa-phone"></i>
                    ${escapeHtml(
                      a.adopterPhone
                    )}
                  </p>


                  ${
                    a.message
                      ? `
                        <p class="adoption-message">
                          "${escapeHtml(
                            a.message
                          )}"
                        </p>
                      `
                      : ""
                  }

                </div>


                <div class="adoption-meta">

                  <span
                    class="status-pill"
                    style="position:static;"
                  >
                    ${escapeHtml(
                      a.status
                    )}
                  </span>

                  <span class="adoption-date">
                    ${date}
                  </span>

                </div>

              </div>
            `;

          })
          .join("");


    } catch (err) {

      console.error(
        "Adoption records error:",
        err
      );


      adoptionsList.innerHTML =
        stateBox({
          icon:
            "fa-triangle-exclamation",
          title:
            "Could not load records",
          text:
            "Please try again in a moment.",
          retry:
            true,
        });

    }

  })();

}


// ============================================================
// MOBILE NAVIGATION
// ============================================================

const navToggle =
  document.getElementById(
    "navToggle"
  );

const navLinks =
  document.getElementById(
    "navLinks"
  );


if (
  navToggle &&
  navLinks
) {

  navToggle.addEventListener(
    "click",
    () => {

      navLinks.classList.toggle(
        "open"
      );

    }
  );

}


// ============================================================
// NAVBAR SHADOW
// ============================================================

const navbar =
  document.getElementById(
    "navbar"
  );


if (navbar) {

  window.addEventListener(
    "scroll",
    () => {

      if (
        window.scrollY > 10
      ) {

        navbar.style.boxShadow =
          "0 4px 20px rgba(0,0,0,0.06)";

      } else {

        navbar.style.boxShadow =
          "none";

      }

    }
  );

}


// ============================================================
// DEBUG
// ============================================================

console.log(
  "PetConnect loaded 🐾"
);

console.log(
  "API:",
  API_BASE_URL
);