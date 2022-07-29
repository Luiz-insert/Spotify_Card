const button_front = document.getElementById('replace_side1');
const button_back = document.getElementById('replace_side2');
const show_side1 = document.getElementById('container_side1')
const show_side2 = document.getElementById('container_side2');


show_side2.style.display = 'none'


button_front.onclick = function () {
    show_side1.style.display = 'none';
    show_side2.style.display = 'flex';
}
button_back.onclick = function () {
    show_side2.style.display = 'none';
    show_side1.style.display = 'flex';
}
