import MicroModal from 'micromodal';
import { doesNotMatch } from 'node:assert';
MicroModal.init();
document.getElementById('image-form').addEventListener('submit', function (e) {
    e.preventDefault(); //preveting page reload

    const formData = { //gathering the form data
        poster: document.getElementById('poster').value,
        name: document.getElementById('name').value,
        year: document.getElementById('year').value,
        genre: document.getElementById('genre').value,
        description: document.getElementById('description').value,
    }

    fetch ('https://webtech.labs.vu.nl/api26/0ce945cd' , { 
        //sending the form data to the server via POST request

        method: 'POST',
        headers: {'Content-type': 'application/json'},
        body: JSON.stringify(formData)
    })
    .then(response => response.json()) //parsing JSON response from the server
    .then(data => {
        if (data.succes) {  //if the submission is succesful --> add to album
            addToAlbum(data.image);
            showSuccesMessage('Game successfully added');
            MicroModal.close('image-form-modal');
        }
        else {
            alert('failed, try again');
        }
    })
    .catch(error => console.error('error', error));
});

function addToAlbum(image) {
    const album = document.getElementById('album');
    const newImageElement = document.createElement('div');
    newImageElement.classList.add('album-item');
    newImageElement.innerHTML = `
        <img src="${image.poster}" alt="${image.name}" class="poster-img"></img>
        <h3>${image.name}</h3>
        <p>${image.year} - ${image.genre}</p>
        <p>${image.description}</p>
    `;
    album.appendChild(newImageElement);
}

function showSuccesMessage(message) {
    //creating the succes msg only if it doesnt already exist 
    const existingMessage = document.createElement('span');
    if (existingMessage) {
        existingMessage.textContent = message;
    }
    else {
    successMessageElement.classList.add('success-message');
    successMessageElement.textContent = message;

    const formActions = document.querySelector ('.form_actions');
    formActions.appendChild(succesMessageElement);
    }
    //displays the message
    const successMessageElement = document.querySelector('.succes-message');
    succesMessageElement.style.display = 'incline-block';

    setTimeout(() => {
        successMessageElement.style.display = 'none' ;
    }, 3000); //hide the succes msg after 3s
}

//open the form modal when this button is clicked
document.getElementById('open-form-btn').addEventListener('click', function() {
    MicroModal.show('image-form-modal'); //opens the modal with the form 
});
