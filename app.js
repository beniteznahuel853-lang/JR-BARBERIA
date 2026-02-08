if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

const barberos = ['Agus', 'Gonza', 'Guido', 'Pablo', 'Junior'];
const porcentajes = {
    'Agus': { barbero: 45, barberia: 55 },
    'Gonza': { barbero: 45, barberia: 55 },
    'Guido': { barbero: 50, barberia: 50 },
    'Pablo': { barbero: 45, barberia: 55 },
    'Junior': { barbero: 0, barberia: 100 }
};
const servicios = { 'Corte': 14000, 'Corte y Barba': 16000, 'Barba': 8000 };

let cortes = JSON.parse(localStorage.getItem('cortesBarberiaData')) || [];
let cortePendiente = null;

// CALENDARIO
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedDate = null;

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    document.getElementById('calendarMonth').textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    for (let i = 0; i < startingDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }
    
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        if (selectedDate === dateStr) dayEl.classList.add('selected');
        
        const hasData = cortes.some(c => c.fecha === dateStr);
        if (hasData) {
            dayEl.classList.add('has-data');
            const indicator = document.createElement('div');
            indicator.className = 'calendar-day-indicator';
            indicator.textContent = '●';
            dayEl.appendChild(indicator);
        }
        
        const numberEl = document.createElement('div');
        numberEl.className = 'calendar-day-number';
        numberEl.textContent = day;
        dayEl.insertBefore(numberEl, dayEl.firstChild);
        
        dayEl.onclick = () => selectDate(dateStr);
        grid.appendChild(dayEl);
    }
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderCalendar();
    
    const date = new Date(dateStr + 'T00:00:00');
    const dateText = `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`;
    document.getElementById('selectedDateText').textContent = dateText;
    document.getElementById('selectedDateInfo').style.display = 'block';
    
    const cortesDay = cortes.filter(c => c.fecha === dateStr);
    const totalCortes = cortesDay.length;
    const totalVentas = cortesDay.reduce((sum, c) => sum + c.precio, 0);
    const efectivo = cortesDay.filter(c => c.metodoPago === 'Efectivo').reduce((sum, c) => sum + c.precio, 0);
    const mercadopago = cortesDay.filter(c => c.metodoPago === 'MercadoPago').reduce((sum, c) => sum + c.precio, 0);
    
    document.getElementById('dayCortes').textContent = totalCortes;
    document.getElementById('dayVentas').textContent = `$${totalVentas.toLocaleString()}`;
    document.getElementById('dayEfectivo').textContent = `$${efectivo.toLocaleString()}`;
    document.getElementById('dayMercadoPago').textContent = `$${mercadopago.toLocaleString()}`;
    
    renderDayDetails(dateStr);
}

function renderDayDetails(dateStr) {
    const cortesDay = cortes.filter(c => c.fecha === dateStr);
    const container = document.getElementById('dayDetails');
    
    if (cortesDay.length === 0) {
        container.innerHTML = '<div class="section"><p style="text-align:center; color:#888;">No hay cortes en este día</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    barberos.forEach(barbero => {
        const cortesBarbero = cortesDay.filter(c => c.barbero === barbero);
        if (cortesBarbero.length === 0) return;
        
        const stats = calcularStatsBarbero(cortesBarbero, barbero);
        
        const section = document.createElement('div');
        section.className = 'barbero-section';
        section.innerHTML = `
            <div class="barbero-title-big">✂️ ${barbero.toUpperCase()}</div>
            <div class="servicios-detalle">
                ${Object.keys(servicios).map(servicio => {
                    const cantidad = stats.porServicio[servicio].cantidad;
                    const subtotal = stats.porServicio[servicio].subtotal;
                    return `
                        <div class="servicio-card">
                            <div class="servicio-nombre">${servicio}</div>
                            <div class="servicio-cantidad">${cantidad}</div>
                            <div class="servicio-subtotal">$${subtotal.toLocaleString()}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="totales-barbero">
                <div class="total-item">
                    <div class="total-item-label">Total Cortes</div>
                    <div class="total-item-value">${stats.totalCortes}</div>
                </div>
                <div class="total-item">
                    <div class="total-item-label">Total Ventas</div>
                    <div class="total-item-value">$${stats.totalDinero.toLocaleString()}</div>
                </div>
            </div>
            <div class="distribucion-grid">
                <div class="dist-card barbero">
                    <div class="dist-label">💰 ${barbero} (${porcentajes[barbero].barbero}%)</div>
                    <div class="dist-value">$${stats.montoBarbero.toLocaleString()}</div>
                </div>
                <div class="dist-card barberia">
                    <div class="dist-label">🏪 Barbería (${porcentajes[barbero].barberia}%)</div>
                    <div class="dist-value">$${stats.montoBarberia.toLocaleString()}</div>
                </div>
            </div>
        `;
        container.appendChild(section);
    });
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

function today() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    selectDate(todayStr);
}

// REGISTRO
function renderRegistro() {
    const grid = document.getElementById('registroGrid');
    grid.innerHTML = '';
    
    barberos.forEach(barbero => {
        const card = document.createElement('div');
        card.className = 'barbero-card';
        card.innerHTML = `
            <div class="barbero-name">${barbero}</div>
            <div class="service-buttons">
                ${Object.keys(servicios).map(servicio => `
                    <button class="service-btn" onclick="abrirModalPago('${barbero}', '${servicio}')">
                        ${servicio}<br>$${servicios[servicio].toLocaleString()}
                    </button>
                `).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
}

function abrirModalPago(barbero, servicio) {
    cortePendiente = { barbero, servicio };
    document.getElementById('paymentModal').classList.add('show');
}

function cerrarModal() {
    document.getElementById('paymentModal').classList.remove('show');
    cortePendiente = null;
}

function confirmarCorte(metodoPago) {
    if (!cortePendiente) return;
    
    const corte = {
        id: Date.now(),
        fecha: new Date().toISOString().split('T')[0],
        barbero: cortePendiente.barbero,
        servicio: cortePendiente.servicio,
        precio: servicios[cortePendiente.servicio],
        metodoPago: metodoPago
    };
    
    cortes.push(corte);
    localStorage.setItem('cortesBarberiaData', JSON.stringify(cortes));
    
    cerrarModal();
    renderAll();
    showNotification(`✅ ${cortePendiente.barbero} - ${cortePendiente.servicio} (${metodoPago})`);
}

function calcularStatsBarbero(cortesBarbero, barbero) {
    const stats = {
        totalCortes: cortesBarbero.length,
        totalDinero: 0,
        porServicio: {}
    };

    Object.keys(servicios).forEach(servicio => {
        stats.porServicio[servicio] = { cantidad: 0, subtotal: 0 };
    });

    cortesBarbero.forEach(corte => {
        stats.totalDinero += corte.precio;
        stats.porServicio[corte.servicio].cantidad++;
        stats.porServicio[corte.servicio].subtotal += corte.precio;
    });

    stats.montoBarbero = Math.round(stats.totalDinero * porcentajes[barbero].barbero / 100);
    stats.montoBarberia = Math.round(stats.totalDinero * porcentajes[barbero].barberia / 100);

    return stats;
}

function renderResumen() {
    const hoy = new Date().toISOString().split('T')[0];
    const cortesHoy = cortes.filter(c => c.fecha === hoy);
    
    const totalCortes = cortesHoy.length;
    const totalVentas = cortesHoy.reduce((sum, c) => sum + c.precio, 0);
    const efectivo = cortesHoy.filter(c => c.metodoPago === 'Efectivo').reduce((sum, c) => sum + c.precio, 0);
    const mercadopago = cortesHoy.filter(c => c.metodoPago === 'MercadoPago').reduce((sum, c) => sum + c.precio, 0);
    
    document.getElementById('totalCortesHoy').textContent = totalCortes;
    document.getElementById('totalVentasHoy').textContent = `$${totalVentas.toLocaleString()}`;
    document.getElementById('totalEfectivoHoy').textContent = `$${efectivo.toLocaleString()}`;
    document.getElementById('totalMercadoPagoHoy').textContent = `$${mercadopago.toLocaleString()}`;
    
    const container = document.getElementById('resumenBarberos');
    container.innerHTML = '';
    
    barberos.forEach(barbero => {
        const cortesBarbero = cortesHoy.filter(c => c.barbero === barbero);
        if (cortesBarbero.length === 0) return;
        
        const stats = calcularStatsBarbero(cortesBarbero, barbero);
        
        const section = document.createElement('div');
        section.className = 'barbero-section';
        section.innerHTML = `
            <div class="barbero-title-big">✂️ ${barbero.toUpperCase()}</div>
            <div class="servicios-detalle">
                ${Object.keys(servicios).map(servicio => `
                    <div class="servicio-card">
                        <div class="servicio-nombre">${servicio}</div>
                        <div class="servicio-cantidad">${stats.porServicio[servicio].cantidad}</div>
                        <div class="servicio-subtotal">$${stats.porServicio[servicio].subtotal.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
            <div class="totales-barbero">
                <div class="total-item">
                    <div class="total-item-label">Total Cortes</div>
                    <div class="total-item-value">${stats.totalCortes}</div>
                </div>
                <div class="total-item">
                    <div class="total-item-label">Total Ventas</div>
                    <div class="total-item-value">$${stats.totalDinero.toLocaleString()}</div>
                </div>
            </div>
            <div class="distribucion-grid">
                <div class="dist-card barbero">
                    <div class="dist-label">💰 ${barbero} (${porcentajes[barbero].barbero}%)</div>
                    <div class="dist-value">$${stats.montoBarbero.toLocaleString()}</div>
                </div>
                <div class="dist-card barberia">
                    <div class="dist-label">🏪 Barbería (${porcentajes[barbero].barberia}%)</div>
                    <div class="dist-value">$${stats.montoBarberia.toLocaleString()}</div>
                </div>
            </div>
        `;
        container.appendChild(section);
    });
}

function showNotification(message) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2500);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

function renderAll() {
    renderCalendar();
    renderRegistro();
    renderResumen();
    if (selectedDate) selectDate(selectedDate);
}

document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    today();
});
