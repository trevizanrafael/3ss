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
  chipHeld: boolean; // LB / C / Tab (Cavadinha!)
  chipJustPressed: boolean;
  chipJustReleased: boolean;
  shootHeld: boolean; // B / Espaço / Botão Esquerdo
  shootJustPressed: boolean;
  shootJustReleased: boolean;
  passHeld: boolean; // A / E (também cancela chute em B+A = Fingir Chute!)
  passJustPressed: boolean;
  passJustReleased: boolean;
  throughHeld: boolean; // Y / F
  throughJustPressed: boolean;
  throughJustReleased: boolean;
  lobHeld: boolean; // X / R
  lobOrSlideJustPressed: boolean;
  lobJustReleased: boolean;
  resetBallJustPressed: boolean; // Select / Back / Share / V
  exitOrFinishJustPressed: boolean; // Start / Options / Menu / Escape
  menuUpJustPressed: boolean;
  menuDownJustPressed: boolean;
}

export class PitchInputCollector {
  private keys = new Set<string>();
  private mouseBtns = new Set<number>();
  private mouseDX = 0;
  private mouseDY = 0;

  private smoothMoveX = 0;
  private smoothMoveZ = 0;

  private prevShoot = false;
  private prevPass = false;
  private prevThrough = false;
  private prevLob = false;
  private prevChip = false;
  private prevReset = false;
  private prevStart = false;
  private prevMenuUp = false;
  private prevMenuDown = false;
  private initializedFromPad = false;

  private hostEl: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (
      ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
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
    // Giro de câmera no mouse somente segurando botão direito/meio (nunca trava o cursor com pointerLock!)
    if (this.mouseBtns.has(2) || this.mouseBtns.has(1)) {
      this.mouseDX += e.movementX * 0.0032;
      this.mouseDY += e.movementY * 0.0024;
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    window.focus?.();
    this.mouseBtns.add(e.button);
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseBtns.delete(e.button);
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  attach(hostEl: HTMLElement): void {
    attachGamepadConnectionListeners();
    window.focus?.();
    this.hostEl = hostEl;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    hostEl.addEventListener('mousedown', this.onMouseDown);
    hostEl.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.hostEl) {
      this.hostEl.removeEventListener('mousedown', this.onMouseDown);
      this.hostEl.removeEventListener('contextmenu', this.onContextMenu);
    }
    window.removeEventListener('mouseup', this.onMouseUp);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.hostEl = null;
  }

  sample(dt: number): LivePitchInput {
    const gp = readNormalizedGamepad();

    if (gp && !this.initializedFromPad) {
      this.initializedFromPad = true;
      this.prevShoot = gp.east;
      this.prevPass = gp.south;
      this.prevThrough = gp.north;
      this.prevLob = gp.west;
      this.prevChip = gp.lb;
      this.prevReset = gp.back;
      this.prevStart = gp.start;
    }

    let rawX = 0;
    let rawZ = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) rawX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) rawX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) rawZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) rawZ += 1;

    if (gp) {
      let dpadX = 0;
      let dpadZ = 0;
      if (gp.dpadLeft) dpadX -= 1;
      if (gp.dpadRight) dpadX += 1;
      if (gp.dpadUp) dpadZ -= 1;
      if (gp.dpadDown) dpadZ += 1;

      if (dpadX !== 0 || dpadZ !== 0) {
        rawX = dpadX;
        rawZ = dpadZ;
      } else {
        const stickMag = Math.hypot(gp.lx, gp.ly);
        const dz = 0.18;
        if (stickMag > dz) {
          const cleanMag = Math.min(1, (stickMag - dz) / (1 - dz));
          rawX = (gp.lx / stickMag) * cleanMag;
          rawZ = (gp.ly / stickMag) * cleanMag;
        }
      }
    }

    const rawLen = Math.hypot(rawX, rawZ);
    if (rawLen > 1) {
      rawX /= rawLen;
      rawZ /= rawLen;
    }

    const alpha = Math.min(1, 26 * dt);
    this.smoothMoveX += (rawX - this.smoothMoveX) * alpha;
    this.smoothMoveZ += (rawZ - this.smoothMoveZ) * alpha;
    if (Math.hypot(this.smoothMoveX, this.smoothMoveZ) < 0.03 && rawLen === 0) {
      this.smoothMoveX = 0;
      this.smoothMoveZ = 0;
    }

    let lookDeltaX = this.mouseDX;
    let lookDeltaY = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;

    if (gp) {
      const rMag = Math.hypot(gp.rx, gp.ry);
      if (rMag > 0.18) {
        const scale = (rMag - 0.18) / 0.82;
        lookDeltaX += (gp.rx / rMag) * scale * 2.65 * dt;
        lookDeltaY += (gp.ry / rMag) * scale * 1.65 * dt;
      }
    }

    const sprintHeld =
      Boolean(gp?.rt) || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const closeControlHeld =
      Boolean(gp?.lt) || this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const finesseHeld = Boolean(gp?.rb) || this.keys.has('KeyQ') || this.mouseBtns.has(2);
    const chipNow = Boolean(gp?.lb) || this.keys.has('KeyC') || this.keys.has('Tab');

    const shootNow = Boolean(gp?.east) || this.keys.has('Space') || this.mouseBtns.has(0);
    const passNow = Boolean(gp?.south) || this.keys.has('KeyE');
    const throughNow = Boolean(gp?.north) || this.keys.has('KeyF');
    const lobNow = Boolean(gp?.west) || this.keys.has('KeyR');
    const resetNow = Boolean(gp?.back) || this.keys.has('KeyV');
    const startNow = Boolean(gp?.start) || this.keys.has('Escape');
    const menuUpNow =
      Boolean(gp?.dpadUp) || Boolean(gp && gp.ly < -0.55) || this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const menuDownNow =
      Boolean(gp?.dpadDown) || Boolean(gp && gp.ly > 0.55) || this.keys.has('ArrowDown') || this.keys.has('KeyS');

    const out: LivePitchInput = {
      moveX: this.smoothMoveX,
      moveZ: this.smoothMoveZ,
      lookDeltaX,
      lookDeltaY,
      sprintHeld,
      closeControlHeld,
      finesseHeld,
      chipHeld: chipNow,
      chipJustPressed: chipNow && !this.prevChip,
      chipJustReleased: !chipNow && this.prevChip,
      shootHeld: shootNow,
      shootJustPressed: shootNow && !this.prevShoot,
      shootJustReleased: !shootNow && this.prevShoot,
      passHeld: passNow,
      passJustPressed: passNow && !this.prevPass,
      passJustReleased: !passNow && this.prevPass,
      throughHeld: throughNow,
      throughJustPressed: throughNow && !this.prevThrough,
      throughJustReleased: !throughNow && this.prevThrough,
      lobHeld: lobNow,
      lobOrSlideJustPressed: lobNow && !this.prevLob,
      lobJustReleased: !lobNow && this.prevLob,
      resetBallJustPressed: resetNow && !this.prevReset,
      exitOrFinishJustPressed: startNow && !this.prevStart,
      menuUpJustPressed: menuUpNow && !this.prevMenuUp,
      menuDownJustPressed: menuDownNow && !this.prevMenuDown,
    };

    this.prevShoot = shootNow;
    this.prevPass = passNow;
    this.prevThrough = throughNow;
    this.prevLob = lobNow;
    this.prevChip = chipNow;
    this.prevReset = resetNow;
    this.prevStart = startNow;
    this.prevMenuUp = menuUpNow;
    this.prevMenuDown = menuDownNow;

    return out;
  }
}
