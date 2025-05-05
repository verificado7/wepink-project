document.getElementById('cart-icon').addEventListener('click', () => {
    alert('Carrinho ainda não implementado.');
});

function toggleMenu() {
    console.log("Toggling menu...");
    const menu = document.querySelector('.menu');
    if (menu) {
        menu.classList.toggle('active');
        console.log("Menu toggled:", menu.classList.contains('active'));
    } else {
        console.error("Menu element not found.");
    }
}

function changeQuantity(button, change) {
    console.log("Changing quantity, change:", change);
    const quantityElement = button.parentElement.querySelector('.quantity');
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent);
        quantity += change;
        if (quantity < 1) quantity = 1;
        quantityElement.textContent = quantity;
        console.log("New quantity:", quantity);
    } else {
        console.error("Quantity element not found.");
    }
}