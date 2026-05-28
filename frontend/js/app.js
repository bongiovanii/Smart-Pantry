let meusIngredientes = ["Banana", "Maçã", "Pão", "Leite"];
const inputIngrediente = document.getElementById("input-ingrediente");
const listaEstoque = document.getElementById("lista-estoque");

function renderizarLista() {
    listaEstoque.innerHTML = ''; // Limpa a lista antes de renderizar

    meusIngredientes.forEach((ingrediente, index) => {
        const itemHTML = `
            <span class="inline-flex items-center px-sm py-xs rounded-full bg-secondary-container text-primary font-label-md text-label-md border border-secondary-container hover:border-primary/30 cursor-pointer transition-colors">
                ${ingrediente}
            </span>
        `;
        listaEstoque.innerHTML += itemHTML;
    });
}

 // Escutar o evento de apertar "Enter" no input
    inputIngrediente.addEventListener('keypress', function (event) {
        // Verifica se a tecla pressionada foi o Enter
        if (event.key === 'Enter') {
            // Pega o texto digitado e remove espaços em branco sobrando
            const novoIngrediente = inputIngrediente.value.trim();

            // Verifica se o usuário não tentou enviar um texto vazio
            if (novoIngrediente !== '') {
                // Adiciona o novo ingrediente no nosso Array
                meusIngredientes.push(novoIngrediente);

                // Limpa o campo de texto
                inputIngrediente.value = '';

                // Manda desenhar a lista atualizada na tela
                renderizarLista();
            }
        }
    });

    // 5. Executa a função de renderizar pela primeira vez quando a página carregar
    renderizarLista();