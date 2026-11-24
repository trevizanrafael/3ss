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
  resetBallJustPressed: boolean; // Select / Back / V
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

  private hostEl: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
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
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    const gp = pads.find((p): p is Gamepad => Boolean(p && p.connected));

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveZ += 1;

    if (gp) {
      const lx = gp.axes[0] ?? 0;
      const ly = gp.axes[1] ?? 0;
      if (Math.hypot(lx, ly) > 0.16) {
        moveX = lx;
        moveZ = ly;
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
      const rx = gp.axes[2] ?? 0;
      const ry = gp.axes[3] ?? 0;
      if (Math.abs(rx) > 0.16) lookDeltaX += rx * 2.55 * dt;
      if (Math.abs(ry) > 0.16) lookDeltaY += ry * 1.65 * dt;
    }

    // Controles Clássicos FIFA (Controle Xbox/PS + Teclado/Mouse):
    // B (btn 1) = Chute | A (btn 0) = Passe | Y (btn 3) = Enfiada | X (btn 2) = Cruzamento/Carrinho
    // RT (btn 7) = Correr | LT (btn 6) = Proteger/Curto | RB (btn 5) = Colocado c/ Curva | LB (btn 4) / R3 (btn 11) = Trava na Bola
    const gpBtn = (i: number) => Boolean(gp?.buttons[i]?.pressed);

    const sprintHeld =
      gpBtn(7) || (gp?.buttons[7]?.value ?? 0) > 0.35 || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const closeControlHeld =
      gpBtn(6) || (gp?.buttons[6]?.value ?? 0) > 0.35 || this.keys.has('ControlLeft');
    const finesseHeld = gpBtn(5) || this.keys.has('KeyQ') || this.mouseBtns.has(2);

    const shootNow = gpBtn(1) || this.keys.has('Space') || this.mouseBtns.has(0);
    const passNow = gpBtn(0) || this.keys.has('KeyE');
    const throughNow = gpBtn(3) || this.keys.has('KeyF');
    const lobNow = gpBtn(2) || this.keys.has('KeyR');
    const toggleCamNow = gpBtn(4) || gpBtn(11) || this.keys.has('Tab') || this.keys.has('KeyC');
    const resetNow = gpBtn(8) || this.keys.has('KeyV');

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
    };

    this.prevShoot = shootNow;
    this.prevPass = passNow;
    this.prevThrough = throughNow;
    this.prevLob = lobNow;
    this.prevToggleCam = toggleCamNow;
    this.prevReset = resetNow;

    return out;
  }
}
