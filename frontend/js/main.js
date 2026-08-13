
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://petconnect-backend.vercel.app";

// Builds a full image URL from the relative path stored in the DB
function petImageUrl(pet) {
  if (pet.image) return `${API_BASE_URL}${pet.image}`;
  // fallback placeholder if no photo was uploaded
  return 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80';
}

function speciesBadgeClass(species) {
  return species === 'Cat' ? 'badge-cat' : 'badge-dog';
}

function genderIcon(gender) {
  return gender === 'Female' ? 'fa-venus' : 'fa-mars';
}

// Fetches the logged-in user. Returns { user, reachable } — reachable is
// false only if the backend itself couldn't be contacted (as opposed to
// simply not having a logged-in session).
async function getCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
    const data = await res.json();
    return { user: data.success ? data.user : null, reachable: true };
  } catch (err) {
    return { user: null, reachable: false };
  }
}

// Builds one pet-card article (used on index.html + browse.html + mypets.html)
// Owner-only controls (Edit / Delete) are shown only when currentUserId
// matches the pet's addedBy — the backend enforces this independently too,
// so this is purely a UI convenience, never the actual security boundary.
function renderPetCard(pet, currentUserId) {
  const isOwner = currentUserId && pet.addedBy && pet.addedBy === currentUserId;
  const ownerBtns = isOwner
    ? `
      <a class="edit-btn" href="editpet.html?id=${pet._id}" aria-label="Edit pet"><i class="fa-solid fa-pen"></i></a>
      <button class="delete-btn" data-pet-id="${pet._id}" data-pet-name="${pet.name}" aria-label="Delete pet"><i class="fa-solid fa-trash"></i></button>
    `
    : '';

  const statusClass = pet.status === 'Pending' ? 'pending' : pet.status === 'Adopted' ? 'adopted' : '';
  const statusBadge = pet.status && pet.status !== 'Available'
    ? `<span class="status-pill ${statusClass}">${pet.status}</span>`
    : '';

  return `
    <article class="pet-card">
      <div class="pet-img">
        <img src="${petImageUrl(pet)}" alt="${pet.name}" />
        <span class="badge ${speciesBadgeClass(pet.species)}">${pet.species}</span>
        <button class="fav-btn" aria-label="Add to favorites"><i class="fa-regular fa-heart"></i></button>
        <div class="owner-actions">${ownerBtns}</div>
        ${statusBadge}
      </div>
      <div class="pet-info">
        <h3>${pet.name}</h3>
        <ul class="pet-meta">
          <li><i class="fa-regular fa-calendar"></i> ${pet.ageValue} ${pet.ageUnit}</li>
          <li><i class="fa-solid ${genderIcon(pet.gender)}"></i> ${pet.gender}</li>
          <li><i class="fa-solid fa-location-dot"></i> ${pet.location}</li>
        </ul>
        <a href="pet-details.html?id=${pet._id}" class="btn btn-view">View Profile</a>
      </div>
    </article>
  `;
}

// Deletes a pet via the API and removes its card from the DOM on success
async function deletePet(petId, petName, cardEl) {
  if (!confirm(`Remove ${petName} from PetConnect? This can't be undone.`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/pets/${petId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete pet');

    if (cardEl) cardEl.remove();
  } catch (err) {
    alert(err.message);
  }
}

function attachDeleteHandlers(container) {
  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const petId = btn.getAttribute('data-pet-id');
      const petName = btn.getAttribute('data-pet-name');
      deletePet(petId, petName, btn.closest('.pet-card'));
    });
  });
}

function stateBox({ icon, title, text, retry }) {
  const retryBtn = retry
    ? `<button type="button" class="btn btn-outline" style="margin-top:16px;" onclick="window.location.reload()"><i class="fa-solid fa-rotate-right"></i> Try Again</button>`
    : '';
  return `
    <div class="state-box">
      <i class="fa-solid ${icon}"></i>
      <h3>${title}</h3>
      <p>${text}</p>
      ${retryBtn}
    </div>
  `;
}

function attachFavHandlers(container) {
  container.querySelectorAll('.fav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const icon = btn.querySelector('i');
      if (btn.classList.contains('active')) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
      } else {
        icon.classList.remove('fa-solid');
        icon.classList.add('fa-regular');
      }
    });
  });
}

// ============ Home Page: Featured Pets ============
const featuredGrid = document.getElementById('featuredGrid');
if (featuredGrid) {
  (async () => {
    try {
      const [{ user }, res] = await Promise.all([
        getCurrentUser(),
        fetch(`${API_BASE_URL}/api/pets`),
      ]);
      const data = await res.json();

      if (!data.success || data.pets.length === 0) {
        featuredGrid.innerHTML = stateBox({
          icon: 'fa-paw',
          title: 'No pets listed yet',
          text: 'Be the first to add a pet up for adoption!',
        });
        return;
      }

      const featured = data.pets.slice(0, 4);
      featuredGrid.innerHTML = featured.map((pet) => renderPetCard(pet, user && user.id)).join('');
      attachFavHandlers(featuredGrid);
      attachDeleteHandlers(featuredGrid);
    } catch (err) {
      featuredGrid.innerHTML = stateBox({
        icon: 'fa-triangle-exclamation',
        title: 'Could not load pets',
        text: 'Please make sure the backend server is running and try again.',
        retry: true,
      });
    }
  })();
}

// ============ Browse Page: All Pets + Filters ============
const petListGrid = document.getElementById('petListGrid');
if (petListGrid) {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const genderFilter = document.getElementById('genderFilter');
  const locationFilter = document.getElementById('locationFilter');
  const sortFilter = document.getElementById('sortFilter');

  const loadPets = async () => {
    petListGrid.innerHTML = stateBox({
      icon: 'fa-spinner fa-spin',
      title: 'Loading pets...',
      text: 'Fetching the latest pets from the database.',
    });

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (speciesFilter && speciesFilter.value) params.set('species', speciesFilter.value);
    if (genderFilter && genderFilter.value) params.set('gender', genderFilter.value);
    if (locationFilter && locationFilter.value.trim()) params.set('location', locationFilter.value.trim());
    if (sortFilter && sortFilter.value) params.set('sort', sortFilter.value);

    try {
      const [{ user }, res] = await Promise.all([
        getCurrentUser(),
        fetch(`${API_BASE_URL}/api/pets?${params.toString()}`),
      ]);
      const data = await res.json();

      if (!data.success || data.pets.length === 0) {
        petListGrid.innerHTML = stateBox({
          icon: 'fa-magnifying-glass',
          title: 'No pets found',
          text: 'Try adjusting your search or filters, or check back soon for new listings.',
        });
        return;
      }

      petListGrid.innerHTML = data.pets.map((pet) => renderPetCard(pet, user && user.id)).join('');
      attachFavHandlers(petListGrid);
      attachDeleteHandlers(petListGrid);
    } catch (err) {
      petListGrid.innerHTML = stateBox({
        icon: 'fa-triangle-exclamation',
        title: 'Could not load pets',
        text: 'Please make sure the backend server is running and try again.',
        retry: true,
      });
    }
  };

  loadPets();

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadPets, 350);
    });
  }
  if (speciesFilter) speciesFilter.addEventListener('change', loadPets);
  if (genderFilter) genderFilter.addEventListener('change', loadPets);
  if (sortFilter) sortFilter.addEventListener('change', loadPets);
  if (locationFilter) {
    locationFilter.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadPets, 350);
    });
  }
}

// ============ Pet Details Page ============
const petDetailsContainer = document.getElementById('petDetailsContainer');
if (petDetailsContainer) {
  const petId = new URLSearchParams(window.location.search).get('id');

  (async () => {
    if (!petId) {
      petDetailsContainer.innerHTML = stateBox({
        icon: 'fa-circle-exclamation',
        title: 'No pet selected',
        text: 'Head back to the browse page and choose a pet to view its profile.',
      });
      return;
    }

    try {
      const [{ user }, res] = await Promise.all([
        getCurrentUser(),
        fetch(`${API_BASE_URL}/api/pets/${petId}`),
      ]);
      const data = await res.json();

      if (!data.success) {
        petDetailsContainer.innerHTML = stateBox({
          icon: 'fa-circle-exclamation',
          title: 'Pet not found',
          text: 'This pet may have been adopted already or removed from the listing.',
        });
        return;
      }

      const pet = data.pet;
      const isAvailable = pet.status === 'Available';
      const isOwner = user && pet.addedBy && pet.addedBy === user.id;

      const actionMarkup = isAvailable
        ? `
          <button type="button" class="btn btn-primary" id="showAdoptFormBtn"><i class="fa-solid fa-heart"></i> Adopt ${pet.name}</button>

          <form id="adoptForm" class="form-card" style="display:none; margin-top:24px; padding:28px;">
            <input type="hidden" name="petId" value="${pet._id}" />
            <h3 style="color:var(--dark); margin-bottom:18px; font-size:1.1rem;"><i class="fa-solid fa-paw" style="color:var(--primary);"></i> Tell us about you</h3>

            <div class="form-group full">
              <label for="adopterName">Full Name *</label>
              <input type="text" id="adopterName" name="adopterName" placeholder="Your name" required />
            </div>
            <div class="form-group full">
              <label for="adopterEmail">Email *</label>
              <input type="text" id="adopterEmail" name="adopterEmail" placeholder="you@example.com" required />
            </div>
            <div class="form-group full">
              <label for="adopterPhone">Phone *</label>
              <input type="text" id="adopterPhone" name="adopterPhone" placeholder="Your contact number" required />
            </div>
            <div class="form-group full">
              <label for="adopterAddress">Address</label>
              <input type="text" id="adopterAddress" name="adopterAddress" placeholder="Where the pet will live" />
            </div>
            <div class="form-group full">
              <label for="adoptMessage">Message</label>
              <textarea id="adoptMessage" name="message" placeholder="Tell us why you'd be a great fit for ${pet.name}..."></textarea>
            </div>

            <div class="form-submit-row">
              <button type="submit" class="btn btn-primary" id="adoptSubmitBtn"><i class="fa-solid fa-check"></i> Submit Adoption Request</button>
              <span class="form-msg" id="adoptMsg"></span>
            </div>
          </form>
        `
        : `
          <span class="btn" style="background:var(--text-light); color:#fff; cursor:not-allowed;"><i class="fa-solid fa-house-circle-check"></i> ${pet.name} Has Been Adopted</span>
        `;

      const ownerMarkup = isOwner
        ? `
          <a href="editpet.html?id=${pet._id}" class="btn btn-outline" style="margin-left:12px;"><i class="fa-solid fa-pen"></i> Edit Listing</a>
          <button type="button" class="btn btn-outline" id="deletePetBtn" style="border-color:var(--danger); color:var(--danger); margin-left:12px;"><i class="fa-solid fa-trash"></i> Delete Listing</button>
        `
        : '';

      petDetailsContainer.innerHTML = `
        <div class="pet-details-layout">
          <div class="pet-details-img">
            <img src="${petImageUrl(pet)}" alt="${pet.name}" />
          </div>
          <div class="pet-details-info">
            <span class="badge ${speciesBadgeClass(pet.species)}" style="position:static; display:inline-block; margin-bottom:12px;">${pet.species}</span>
            <h1 style="font-size:2rem; color:var(--dark); margin-bottom:12px;">${pet.name}</h1>
            <ul class="pet-meta" style="font-size:0.9rem; margin-bottom:20px;">
              <li><i class="fa-solid fa-dog"></i> ${pet.breed}</li>
              <li><i class="fa-regular fa-calendar"></i> ${pet.ageValue} ${pet.ageUnit}</li>
              <li><i class="fa-solid ${genderIcon(pet.gender)}"></i> ${pet.gender}</li>
              <li><i class="fa-solid fa-location-dot"></i> ${pet.location}</li>
            </ul>
            <p style="color:var(--text-light); margin-bottom:28px; line-height:1.7;">${pet.description || 'No description provided yet.'}</p>
            <div style="display:flex; align-items:center; flex-wrap:wrap;">
              ${actionMarkup}
              ${ownerMarkup}
            </div>
          </div>
        </div>
      `;

      if (isOwner) {
        document.getElementById('deletePetBtn').addEventListener('click', async () => {
          if (!confirm(`Remove ${pet.name} from PetConnect? This can't be undone.`)) return;
          try {
            const delRes = await fetch(`${API_BASE_URL}/api/pets/${pet._id}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            const delData = await delRes.json();
            if (!delRes.ok || !delData.success) throw new Error(delData.message || 'Failed to delete pet');
            window.location.href = 'browse.html';
          } catch (err) {
            alert(err.message);
          }
        });
      }

      if (isAvailable) {
        const showAdoptFormBtn = document.getElementById('showAdoptFormBtn');
        const adoptForm = document.getElementById('adoptForm');

        showAdoptFormBtn.addEventListener('click', () => {
          adoptForm.style.display = adoptForm.style.display === 'none' ? 'block' : 'none';
          if (adoptForm.style.display === 'block') {
            adoptForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // prefill name/email if the adopter is logged in
            if (user) {
              document.getElementById('adopterName').value = user.name;
              document.getElementById('adopterEmail').value = user.email;
            }
          }
        });

        adoptForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const adoptMsg = document.getElementById('adoptMsg');
          const adoptSubmitBtn = document.getElementById('adoptSubmitBtn');
          adoptMsg.textContent = '';
          adoptMsg.className = 'form-msg';
          adoptSubmitBtn.disabled = true;
          adoptSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

          try {
            const formData = new FormData(adoptForm);
            const payload = Object.fromEntries(formData.entries());

            const res = await fetch(`${API_BASE_URL}/api/adoptions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            });
            const resData = await res.json();

            if (!res.ok || !resData.success) throw new Error(resData.message || 'Something went wrong');

            adoptMsg.textContent = resData.message;
            adoptMsg.classList.add('success');
            adoptForm.reset();

            setTimeout(() => {
              window.location.href = 'browse.html';
            }, 1500);
          } catch (err) {
            adoptMsg.textContent = err.message;
            adoptMsg.classList.add('error');
          } finally {
            adoptSubmitBtn.disabled = false;
            adoptSubmitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submit Adoption Request';
          }
        });
      }
    } catch (err) {
      petDetailsContainer.innerHTML = stateBox({
        icon: 'fa-triangle-exclamation',
        title: 'Could not load pet',
        text: 'Please make sure the backend server is running and try again.',
        retry: true,
      });
    }
  })();
}

// ============ Add Pet Form ============
const addPetForm = document.getElementById('addPetForm');
const addPetLoginNotice = document.getElementById('addPetLoginNotice');
if (addPetForm) {
  (async () => {
    const { user, reachable } = await getCurrentUser();
    if (!user) {
      addPetForm.style.display = 'none';
      if (addPetLoginNotice) {
        addPetLoginNotice.style.display = 'block';
        if (!reachable) {
          addPetLoginNotice.querySelector('i').className = 'fa-solid fa-triangle-exclamation';
          addPetLoginNotice.querySelector('h3').textContent = 'Could not reach the server';
          addPetLoginNotice.querySelector('p').textContent = 'Please make sure the backend server is running on port 5000, then refresh this page.';
          addPetLoginNotice.querySelector('a').style.display = 'none';
        }
      }
      return;
    }

    const formMsg = document.getElementById('formMsg');
    const submitBtn = document.getElementById('submitBtn');
    const imageInput = document.getElementById('image');
    const filePreview = document.getElementById('filePreview');
    const filePreviewImg = document.getElementById('filePreviewImg');
    const fileDropText = document.getElementById('fileDropText');

    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;
      fileDropText.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        filePreviewImg.src = e.target.result;
        filePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    addPetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      formMsg.textContent = '';
      formMsg.className = 'form-msg';

      const formData = new FormData(addPetForm);

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding Pet...';

      try {
        const res = await fetch(`${API_BASE_URL}/api/pets`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Something went wrong');
        }

        formMsg.textContent = `${data.pet.name} was added successfully! Redirecting to browse page...`;
        formMsg.classList.add('success');
        addPetForm.reset();
        filePreview.style.display = 'none';
        fileDropText.textContent = 'Click to upload a photo (JPG, PNG, WEBP — max 5MB)';

        setTimeout(() => {
          window.location.href = 'browse.html';
        }, 1200);
      } catch (err) {
        formMsg.textContent = err.message || 'Failed to add pet. Please make sure the backend server is running.';
        formMsg.classList.add('error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paw"></i> Add Pet';
      }
    });
  })();
}

// ============ Edit Pet Form ============
// Reuses the same form markup/ids as Add Pet (editpet.html renders an
// identical form), but pre-fills it from the existing pet and PUTs the
// changes instead of POSTing a new pet. The backend re-checks ownership
// independently, so this page can't be used to edit someone else's pet
// even if someone crafts the request by hand.
const editPetForm = document.getElementById('editPetForm');
const editPetStateBox = document.getElementById('editPetStateBox');
if (editPetForm) {
  const petId = new URLSearchParams(window.location.search).get('id');

  (async () => {
    if (!petId) {
      editPetForm.style.display = 'none';
      if (editPetStateBox) {
        editPetStateBox.innerHTML = stateBox({
          icon: 'fa-circle-exclamation',
          title: 'No pet selected',
          text: 'Head back to My Pets and choose a listing to edit.',
        });
      }
      return;
    }

    const { user } = await getCurrentUser();
    if (!user) {
      editPetForm.style.display = 'none';
      if (editPetStateBox) {
        editPetStateBox.innerHTML = stateBox({
          icon: 'fa-lock',
          title: 'Please log in',
          text: 'You need to be logged in to edit a pet listing.',
        });
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/pets/${petId}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Pet not found');
      }

      const pet = data.pet;
      const isOwner = pet.addedBy && pet.addedBy === user.id;

      if (!isOwner) {
        editPetForm.style.display = 'none';
        if (editPetStateBox) {
          editPetStateBox.innerHTML = stateBox({
            icon: 'fa-lock',
            title: 'Not your listing',
            text: 'You can only edit pets that you added yourself.',
          });
        }
        return;
      }

      // Pre-fill the form fields with the pet's current details
      editPetForm.querySelector('#name').value = pet.name;
      editPetForm.querySelector('#species').value = pet.species;
      editPetForm.querySelector('#breed').value = pet.breed;
      editPetForm.querySelector('#gender').value = pet.gender;
      editPetForm.querySelector('#ageValue').value = pet.ageValue;
      editPetForm.querySelector('#ageUnit').value = pet.ageUnit;
      editPetForm.querySelector('#location').value = pet.location;
      editPetForm.querySelector('#description').value = pet.description || '';

      const filePreview = document.getElementById('filePreview');
      const filePreviewImg = document.getElementById('filePreviewImg');
      if (pet.image && filePreview && filePreviewImg) {
        filePreviewImg.src = petImageUrl(pet);
        filePreview.style.display = 'block';
      }

      const formMsg = document.getElementById('formMsg');
      const submitBtn = document.getElementById('submitBtn');
      const imageInput = document.getElementById('image');
      const fileDropText = document.getElementById('fileDropText');

      if (imageInput) {
        imageInput.addEventListener('change', () => {
          const file = imageInput.files[0];
          if (!file) return;
          if (fileDropText) fileDropText.textContent = file.name;
          const reader = new FileReader();
          reader.onload = (e) => {
            filePreviewImg.src = e.target.result;
            filePreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        });
      }

      editPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMsg.textContent = '';
        formMsg.className = 'form-msg';

        const formData = new FormData(editPetForm);

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Changes...';

        try {
          const putRes = await fetch(`${API_BASE_URL}/api/pets/${petId}`, {
            method: 'PUT',
            credentials: 'include',
            body: formData,
          });
          const putData = await putRes.json();

          if (!putRes.ok || !putData.success) {
            throw new Error(putData.message || 'Something went wrong');
          }

          formMsg.textContent = `${putData.pet.name} was updated successfully! Redirecting...`;
          formMsg.classList.add('success');

          setTimeout(() => {
            window.location.href = 'mypets.html';
          }, 1200);
        } catch (err) {
          formMsg.textContent = err.message || 'Failed to update pet. Please make sure the backend server is running.';
          formMsg.classList.add('error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        }
      });
    } catch (err) {
      editPetForm.style.display = 'none';
      if (editPetStateBox) {
        editPetStateBox.innerHTML = stateBox({
          icon: 'fa-triangle-exclamation',
          title: 'Could not load pet',
          text: 'Please make sure the backend server is running and try again.',
          retry: true,
        });
      }
    }
  })();
}

// ============ My Pets Page ============
const myPetsGrid = document.getElementById('myPetsGrid');
if (myPetsGrid) {
  (async () => {
    const { user } = await getCurrentUser();

    if (!user) {
      myPetsGrid.innerHTML = stateBox({
        icon: 'fa-lock',
        title: 'Please log in',
        text: 'Log in to see the pets you have listed for adoption.',
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/pets/mine`, { credentials: 'include' });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || 'Failed to load your pets');

      if (data.pets.length === 0) {
        myPetsGrid.innerHTML = stateBox({
          icon: 'fa-paw',
          title: "You haven't listed any pets yet",
          text: 'Add a pet to start finding it a loving home.',
        });
        return;
      }

      myPetsGrid.innerHTML = data.pets.map((pet) => renderPetCard(pet, user.id)).join('');
      attachFavHandlers(myPetsGrid);
      attachDeleteHandlers(myPetsGrid);
    } catch (err) {
      myPetsGrid.innerHTML = stateBox({
        icon: 'fa-triangle-exclamation',
        title: 'Could not load your pets',
        text: 'Please make sure the backend server is running and try again.',
        retry: true,
      });
    }
  })();
}

// ============ Auth: Session-Aware Nav Button ============
const navAuthBtn = document.getElementById('navAuthBtn');
const myPetsLink = document.getElementById('myPetsLink');

async function refreshAuthNav() {
  const { user } = await getCurrentUser();
  if (!user) return; // not logged in — leave the default "Login / Sign Up" link and hidden My Pets link as-is

  // "My Pets" only makes sense once someone owns pets, i.e. is logged in
  if (myPetsLink) myPetsLink.style.display = '';

  if (!navAuthBtn) return;

  navAuthBtn.textContent = '';
  navAuthBtn.removeAttribute('href');
  navAuthBtn.style.cursor = 'pointer';
  navAuthBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Log Out (${user.name.split(' ')[0]})`;
  navAuthBtn.onclick = async (e) => {
    e.preventDefault();
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = 'index.html';
  };
}
refreshAuthNav();

// ============ Login / Sign Up Page ============
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const signupForm = document.getElementById('signupForm');
  const loginTabBtn = document.getElementById('loginTabBtn');
  const signupTabBtn = document.getElementById('signupTabBtn');
  const loginMsg = document.getElementById('loginMsg');
  const signupMsg = document.getElementById('signupMsg');
  const loginSubmitBtn = document.getElementById('loginSubmitBtn');
  const signupSubmitBtn = document.getElementById('signupSubmitBtn');

  loginTabBtn.addEventListener('click', () => {
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  });

  signupTabBtn.addEventListener('click', () => {
    signupTabBtn.classList.add('active');
    loginTabBtn.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = '';
    loginMsg.className = 'form-msg';
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPassword').value,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');

      loginMsg.textContent = data.message;
      loginMsg.classList.add('success');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    } catch (err) {
      loginMsg.textContent = err.message;
      loginMsg.classList.add('error');
    } finally {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';
    }
  });

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupMsg.textContent = '';
    signupMsg.className = 'form-msg';

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (!isValidEmail(email)) {
      signupMsg.textContent = 'Please enter a valid email address';
      signupMsg.classList.add('error');
      return;
    }
    if (password.length < 6) {
      signupMsg.textContent = 'Password must be at least 6 characters';
      signupMsg.classList.add('error');
      return;
    }
    if (password !== confirmPassword) {
      signupMsg.textContent = 'Passwords do not match';
      signupMsg.classList.add('error');
      return;
    }

    signupSubmitBtn.disabled = true;
    signupSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.message || 'Sign up failed');

      signupMsg.textContent = data.message;
      signupMsg.classList.add('success');
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    } catch (err) {
      signupMsg.textContent = err.message;
      signupMsg.classList.add('error');
    } finally {
      signupSubmitBtn.disabled = false;
      signupSubmitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
    }
  });
}

// ============ Adoption Records Page ============
const adoptionsList = document.getElementById('adoptionsList');
if (adoptionsList) {
  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/adoptions`);
      const data = await res.json();

      if (!data.success || data.adoptions.length === 0) {
        adoptionsList.innerHTML = stateBox({
          icon: 'fa-clipboard-list',
          title: 'No adoptions yet',
          text: 'Once a pet is adopted, the record will show up here.',
        });
        return;
      }

      adoptionsList.innerHTML = data.adoptions.map((a) => {
        const petImg = a.petImage ? `${API_BASE_URL}${a.petImage}` : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80';
        const date = new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        return `
          <div class="adoption-row">
            <img src="${petImg}" alt="${a.petName}" class="adoption-pet-img" />
            <div class="adoption-details">
              <h4>${a.petName}${a.petBreed ? ` <span style="font-weight:400; color:var(--text-light); font-size:0.85rem;">(${a.petBreed})</span>` : ''}</h4>
              <p><i class="fa-regular fa-user"></i> ${a.adopterName} &nbsp;·&nbsp; <i class="fa-regular fa-envelope"></i> ${a.adopterEmail} &nbsp;·&nbsp; <i class="fa-solid fa-phone"></i> ${a.adopterPhone}</p>
              ${a.message ? `<p class="adoption-message">"${a.message}"</p>` : ''}
            </div>
            <div class="adoption-meta">
              <span class="status-pill" style="position:static;">${a.status}</span>
              <span class="adoption-date">${date}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      adoptionsList.innerHTML = stateBox({
        icon: 'fa-triangle-exclamation',
        title: 'Could not load records',
        text: 'Please make sure the backend server is running and try again.',
        retry: true,
      });
    }
  })();
}

// ============ Mobile Navigation Toggle ============
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// ============ Sticky Navbar Shadow on Scroll ============
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});

console.log('PetConnect homepage loaded 🐾');
