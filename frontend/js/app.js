document.addEventListener("DOMContentLoaded", async () => {
  const menuCategorias = document.getElementById("menu-categorias");
  const listaProductos = document.getElementById("lista-productos");

  async function cargarCategorias() {
    menuCategorias.innerHTML = "";

    // Botón TODOS
    const liTodos = document.createElement("li");
    liTodos.classList.add("nav-item");
    liTodos.innerHTML = `<a class="nav-link active" href="#">Todos</a>`;
    liTodos.querySelector("a").addEventListener("click", async (e) => {
      e.preventDefault();
      await cargarProductos();
    });
    menuCategorias.appendChild(liTodos);

    // Categorías de la BD
    const categorias = await getCategorias();
    categorias.forEach(c => {
      const li = document.createElement("li");
      li.classList.add("nav-item");
      li.innerHTML = `<a class="nav-link" href="#">${c.nombre}</a>`;
      li.querySelector("a").addEventListener("click", async (e) => {
        e.preventDefault();
        const productos = await getProductos();
        mostrarProductos(productos.filter(p => p.categoria_id == c.id));
      });
      menuCategorias.appendChild(li);
    });
  }

  async function cargarProductos() {
    const productos = await getProductos();
    mostrarProductos(productos);
  }

  async function mostrarProductos(productos) {
    listaProductos.innerHTML = "";
    if (productos.length === 0) {
      listaProductos.innerHTML = `<p>No hay productos.</p>`;
      return;
    }
    for (let p of productos) {
      const imagenes = await getImagenes(p.id);
      const img = imagenes.length ? imagenes[0].url : "https://via.placeholder.com/200";
      listaProductos.innerHTML += `
        <div class="col-md-3 mb-4">
          <div class="card shadow-sm h-100">
            <img src="${img}" class="card-img-top" style="height:200px;object-fit:cover">
            <div class="card-body text-center">
              <h5 class="card-title">${p.nombre}</h5>
              <p class="text-muted">$${p.precio}</p>
              <a href="detalle.html?id=${p.id}" class="btn btn-primary btn-sm">Ver detalle</a>
            </div>
          </div>
        </div>
      `;
    }
  }

  await cargarCategorias();
  await cargarProductos();
});

