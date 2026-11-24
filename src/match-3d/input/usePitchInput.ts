import {
  attachGamepadConnectionListeners,
  readNormalizedGamepad,
} from '../../shared/gamepad/gamepadHardware';

export interface LivePitchInput {
  moveX: number; // -1..1 (Esquerda/Direita relativo à câmera)
  moveZ: number; // -1..1 (-1 = Frente, +1 = Trás)
  lookDeltaX: number; // Giro horizontal da câmera no frame
  lookDeltaY: number; // Inclinação vertical da câmera
  sprintHeld: boolean; // RT / Shift
  closeControlHeld: boolean; // LT / Ctrl
  finesseHeld: boolean; // RB / Q / Botão Direito
  shootHeld: boolean; // B / Espaço / Botão Esquerdo (segurar carrega barra!)
  shootJustReleased: boolean;
  passJustPressed: boolean; // A / E
  throughJustPressed: boolean; // Y / F
  lobOrSlideJustPressed: boolean; // X / R
  toggleCameraJustPressed: boolean; // LB / R3 / Tab / C
  resetBallJustPressed: boolean; // Select / Back / Share / V / Backspace
  exitOrFinishJustPressed: boolean; // Start / Options / Menu
}

export class PitchInputCollector {
  private keys = new Set<string>();
  private mouseBtns = new Set<number>();
  private mouseDX = 0;
  private mouseDY = 0;

  private prevShoot = false;
  private prevPass = false;
  private prevThrough = false;
  private prevLob = false;
  private prevToggleCam = false;
  private prevReset = false;
  private prevStart = false;
  private initializedFromPad = false;

  private hostEl: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (
      ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.hostEl) {
      this.mouseDX += e.movementX * 0.0028;
      this.mouseDY += e.movementY * 0.0022;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    window.focus?.();
    if (!this.hostEl) return;
    if (document.pointerLockElement !== this.hostEl && e.target === this.hostEl.firstChild) {
      this.hostEl.requestPointerLock?.().catch?.(() => {});
    }
    this.mouseBtns.add(e.button);
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseBtns.delete(e.button);
  };

  attach(hostEl: HTMLElement): void {
    attachGamepadConnectionListeners();
    window.focus?.();
    this.hostEl = hostEl;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    hostEl.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.hostEl) {
      this.hostEl.removeEventListener('mousedown', this.onMouseDown);
    }
    window.removeEventListener('mouseup', this.onMouseUp);
    if (document.pointerLockElement === this.hostEl) {
      document.exitPointerLock?.();
    }
    this.hostEl = null;
  }

  sample(dt: number): LivePitchInput {
    const gp = readNormalizedGamepad();

    // No primeiro frame da Arena, sincroniza botões que já entraram pressionados (ex: entrou apertando A ou Y!)
    if (gp && !this.initializedFromPad) {
      this.initializedFromPad = true;
      this.prevShoot = gp.east;
      this.prevPass = gp.south;
      this.prevThrough = gp.north;
      this.prevLob = gp.west;
      this.prevToggleCam = gp.lb || gp.r3;
      this.prevReset = gp.back;
      this.prevStart = gp.start;
    }

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;

    if (gp) {
      // Suporta TANTO Analógico Esquerdo (LS) QUANTO D-Pad para correr e mirar!
      let dpadX = 0;
      let dpadZ = 0;
      if (gp.dpadLeft) dpadX -= 1;
      if (gp.dpadRight) dpadX += 1;
      if (gp.dpadUp) dpadZ -= 1;
      if (gp.dpadDown) dpadZ += 1;

      if (dpadX !== 0 || dpadZ !== 0) {
        moveX = dpadX;
        moveZ = dpadZ;
      } else if (Math.hypot(gp.lx, gp.ly) > 0.15) {
        moveX = gp.lx;
        moveZ = gp.ly;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    let lookDeltaX = this.mouseDX;
    let lookDeltaY = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;

    if (gp) {
      if (Math.abs(gp.rx) > 0.16) lookDeltaX += gp.rx * 2.65 * dt;
      if (Math.abs(gp.ry) > 0.16) lookDeltaY += gp.ry * 1.65 * dt;
    }

    // Controles Clássicos FIFA (Controle Xbox/PlayStation + Teclado/Mouse):
    // B / Circle = Chute | A / Cross = Passe | Y / Triangle = Enfiada | X / Square = Cruzamento/Carrinho
    // RT / R2 = Correr | LT / L2 = Condução Curta | RB / R1 = Colocado c/ Curva | LB / L1 / R3 = Trava na Bola
    const sprintHeld =
      Boolean(gp?.rt) || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const closeControlHeld =
      Boolean(gp?.lt) || this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const finesseHeld = Boolean(gp?.rb) || this.keys.has('KeyQ') || this.mouseBtns.has(2);

    const shootNow = Boolean(gp?.east) || this.keys.has('Space') || this.mouseBtns.has(0);
    const passNow = Boolean(gp?.south) || this.keys.has('KeyE');
    const throughNow = Boolean(gp?.north) || this.keys.has('KeyF');
    const lobNow = Boolean(gp?.west) || this.keys.has('KeyR');
    const toggleCamNow =
      Boolean(gp?.lb || gp?.r3) || this.keys.has('Tab') || this.keys.has('KeyC');
    const resetNow =
      Boolean(gp?.back) || this.keys.has('KeyV') || this.keys.has('Backspace');
    const startNow = Boolean(gp?.start);

    const out: LivePitchInput = {
      moveX,
      moveZ,
      lookDeltaX,
      lookDeltaY,
      sprintHeld,
      closeControlHeld,
      finesseHeld,
      shootHeld: shootNow,
      shootJustReleased: !shootNow && this.prevShoot,
      passJustPressed: passNow && !this.prevPass,
      throughJustPressed: throughNow && !this.prevThrough,
      lobOrSlideJustPressed: lobNow && !this.prevLob,
      toggleCameraJustPressed: toggleCamNow && !this.prevToggleCam,
      resetBallJustPressed: resetNow && !this.prevReset,
      exitOrFinishJustPressed: startNow && !this.prevStart,
    };

    this.prevShoot = shootNow;
    this.prevPass = passNow;
    this.prevThrough = throughNow;
    this.prevLob = lobNow;
    this.prevToggleCam = toggleCamNow;
    this.prevReset = resetNow;
    this.prevStart = startNow;

    return out;
  }
}
